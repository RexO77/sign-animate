import { fetchFile } from '@ffmpeg/util';
import { createFrameRenderer } from './frameRenderer';
import { getFfmpeg, getFfmpegDiagnostics } from './ffmpegClient';
import { ExportError, ExportErrorCode, asExportError } from './exportErrors';

export const EXPORT_PRESETS = {
  mp4: {
    maxLongEdge: 1280,
    targetFps: 24,
    maxFrames: 240,
    mimeType: 'video/mp4',
    extension: 'mp4',
    filename: 'signature.mp4',
    background: '#ffffff',
  },
  gif: {
    maxLongEdge: 720,
    targetFps: 15,
    maxFrames: 120,
    mimeType: 'image/gif',
    extension: 'gif',
    filename: 'signature.gif',
    background: '#ffffff',
  },
};

export function getPresetForFormat(format) {
  const preset = EXPORT_PRESETS[format];
  if (!preset) {
    throw new ExportError(ExportErrorCode.ENCODER_UNAVAILABLE, `Unsupported export format: ${format}`);
  }
  return preset;
}

function clampFps(fps) {
  const safe = Math.max(Number(fps) || 1, 1);
  return safe.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function frameFileName(prefix, index) {
  return `${prefix}_frame_${String(index).padStart(4, '0')}.png`;
}

async function safeDeleteFile(ffmpeg, file) {
  try {
    await ffmpeg.deleteFile(file);
  } catch {
    // no-op cleanup
  }
}

async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ExportError(ExportErrorCode.FRAME_ENCODE_FAILED, 'Unable to encode frame as PNG.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function asUint8Array(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer || data);
}

async function execOrThrow(ffmpeg, args, details) {
  const ret = await ffmpeg.exec(args);
  if (ret !== 0) {
    throw new ExportError(
      ExportErrorCode.ENCODE_NONZERO_EXIT,
      `ffmpeg exited with code ${ret}`,
      { ...details, args, ret },
    );
  }
}

async function readOutputOrThrow(ffmpeg, outputFile, context) {
  try {
    const data = asUint8Array(await ffmpeg.readFile(outputFile));
    if (!data?.length) {
      throw new ExportError(ExportErrorCode.OUTPUT_MISSING, 'Encoder output file is empty.', context);
    }
    return data;
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError(ExportErrorCode.OUTPUT_MISSING, `Output file ${outputFile} was not produced.`, {
      ...context,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

async function encodeMp4(ffmpeg, framePattern, fps, outputFile) {
  const attempts = [];

  const candidates = [
    {
      codec: 'libx264',
      args: [
        '-framerate', fps,
        '-i', framePattern,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputFile,
      ],
    },
    {
      codec: 'mpeg4',
      args: [
        '-framerate', fps,
        '-i', framePattern,
        '-c:v', 'mpeg4',
        '-q:v', '3',
        '-pix_fmt', 'yuv420p',
        outputFile,
      ],
    },
  ];

  for (const candidate of candidates) {
    try {
      await execOrThrow(ffmpeg, candidate.args, { codec: candidate.codec, phase: 'mp4' });
      return await readOutputOrThrow(ffmpeg, outputFile, { codec: candidate.codec });
    } catch (error) {
      attempts.push({
        codec: candidate.codec,
        error: error instanceof Error ? error.message : String(error),
      });
      await safeDeleteFile(ffmpeg, outputFile);
    }
  }

  throw new ExportError(
    ExportErrorCode.ENCODER_UNAVAILABLE,
    'No MP4 encoder candidate produced output.',
    { attempts },
  );
}

async function encodeGif(ffmpeg, framePattern, fps, outputFile, paletteFile) {
  try {
    await execOrThrow(ffmpeg, [
      '-framerate', fps,
      '-i', framePattern,
      '-vf', 'palettegen=stats_mode=single:max_colors=256',
      paletteFile,
    ], { phase: 'gif-palettegen' });

    await execOrThrow(ffmpeg, [
      '-framerate', fps,
      '-i', framePattern,
      '-i', paletteFile,
      '-lavfi', 'paletteuse=dither=sierra2_4a',
      '-loop', '0',
      outputFile,
    ], { phase: 'gif-paletteuse' });

    return await readOutputOrThrow(ffmpeg, outputFile, { phase: 'gif-palette' });
  } catch (paletteError) {
    await safeDeleteFile(ffmpeg, outputFile);
    await safeDeleteFile(ffmpeg, paletteFile);

    try {
      await execOrThrow(ffmpeg, [
        '-framerate', fps,
        '-i', framePattern,
        '-loop', '0',
        outputFile,
      ], { phase: 'gif-fallback' });

      return await readOutputOrThrow(ffmpeg, outputFile, { phase: 'gif-fallback' });
    } catch (fallbackError) {
      throw new ExportError(
        ExportErrorCode.ENCODE_NONZERO_EXIT,
        'GIF encoder failed for both palette and fallback modes.',
        {
          paletteError: paletteError instanceof Error ? paletteError.message : String(paletteError),
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        },
      );
    }
  }
}

export async function exportAnimatedSignature({
  format,
  model,
  onStageChange,
  onProgress,
}) {
  const preset = getPresetForFormat(format);
  const renderer = createFrameRenderer(model, {
    maxLongEdge: preset.maxLongEdge,
    targetFps: preset.targetFps,
    maxFrames: preset.maxFrames,
    background: preset.background,
  });

  let ffmpeg;
  try {
    ffmpeg = await getFfmpeg();
  } catch (error) {
    throw asExportError(error, ExportErrorCode.FFMPEG_LOAD_FAILED, 'Unable to initialize ffmpeg in browser.');
  }

  const filePrefix = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdFiles = [];
  const framePattern = `${filePrefix}_frame_%04d.png`;
  const outputFile = `${filePrefix}.${preset.extension}`;
  const paletteFile = `${filePrefix}_palette.png`;

  try {
    onStageChange?.('render_local');

    for (let index = 0; index < renderer.totalFrames; index += 1) {
      const progress = renderer.totalFrames === 1 ? 1 : index / (renderer.totalFrames - 1);
      const time = progress * renderer.durationSec;

      renderer.renderFrameAt(time);
      const frameBlob = await canvasToPngBlob(renderer.canvas);

      const fileName = frameFileName(filePrefix, index);
      await ffmpeg.writeFile(fileName, await fetchFile(frameBlob));
      createdFiles.push(fileName);

      onProgress?.((index + 1) / renderer.totalFrames);
    }

    onStageChange?.('encode_local');

    const fps = clampFps(renderer.effectiveFps);
    let outputData;

    if (format === 'mp4') {
      outputData = await encodeMp4(ffmpeg, framePattern, fps, outputFile);
    } else {
      outputData = await encodeGif(ffmpeg, framePattern, fps, outputFile, paletteFile);
    }

    createdFiles.push(outputFile, paletteFile);

    return new Blob([outputData], { type: preset.mimeType });
  } catch (error) {
    const diagnostics = getFfmpegDiagnostics();
    const wrapped = asExportError(error, ExportErrorCode.ENCODE_NONZERO_EXIT, 'Animated export failed.');
    wrapped.details = {
      ...(wrapped.details || {}),
      format,
      diagnostics,
    };
    throw wrapped;
  } finally {
    const uniqueFiles = [...new Set([...createdFiles, outputFile, paletteFile])];
    await Promise.all(uniqueFiles.map((file) => safeDeleteFile(ffmpeg, file)));
  }
}
