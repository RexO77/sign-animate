import { fetchFile } from '@ffmpeg/util';
import { createFrameRenderer } from './frameRenderer';
import { getFfmpeg } from './ffmpegClient';

const PRESETS = {
  mp4: {
    maxLongEdge: 1280,
    targetFps: 24,
    maxFrames: 240,
    mimeType: 'video/mp4',
    extension: 'mp4',
  },
  gif: {
    maxLongEdge: 720,
    targetFps: 15,
    maxFrames: 120,
    mimeType: 'image/gif',
    extension: 'gif',
  },
};

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
    // Ignore cleanup errors.
  }
}

async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to encode frame as PNG.'));
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

export async function exportAnimatedSignature({
  format,
  model,
  onStageChange,
  onProgress,
}) {
  const preset = PRESETS[format];
  if (!preset) {
    throw new Error(`Unsupported export format: ${format}`);
  }

  const renderer = createFrameRenderer(model, {
    maxLongEdge: preset.maxLongEdge,
    targetFps: preset.targetFps,
    maxFrames: preset.maxFrames,
    background: '#ffffff',
  });

  const ffmpeg = await getFfmpeg();
  const filePrefix = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const createdFiles = [];
  let outputFile = '';
  let paletteFile = '';

  try {
    onStageChange?.('render');

    for (let index = 0; index < renderer.totalFrames; index += 1) {
      const progress = renderer.totalFrames === 1
        ? 1
        : index / (renderer.totalFrames - 1);
      const time = progress * renderer.durationSec;

      renderer.renderFrameAt(time);
      const frameBlob = await canvasToPngBlob(renderer.canvas);

      const fileName = frameFileName(filePrefix, index);
      await ffmpeg.writeFile(fileName, await fetchFile(frameBlob));
      createdFiles.push(fileName);

      onProgress?.((index + 1) / renderer.totalFrames);
    }

    onStageChange?.('encode');

    const fps = clampFps(renderer.effectiveFps);
    const framePattern = `${filePrefix}_frame_%04d.png`;

    if (format === 'mp4') {
      outputFile = `${filePrefix}.${preset.extension}`;
      createdFiles.push(outputFile);

      await ffmpeg.exec([
        '-framerate', fps,
        '-i', framePattern,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputFile,
      ]);
    } else {
      paletteFile = `${filePrefix}_palette.png`;
      outputFile = `${filePrefix}.${preset.extension}`;
      createdFiles.push(paletteFile, outputFile);

      await ffmpeg.exec([
        '-framerate', fps,
        '-i', framePattern,
        '-vf', 'palettegen=stats_mode=single:max_colors=256',
        paletteFile,
      ]);

      await ffmpeg.exec([
        '-framerate', fps,
        '-i', framePattern,
        '-i', paletteFile,
        '-lavfi', 'paletteuse=dither=sierra2_4a',
        '-loop', '0',
        outputFile,
      ]);
    }

    const outputData = asUint8Array(await ffmpeg.readFile(outputFile));
    return new Blob([outputData], { type: preset.mimeType });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Animated export failed: ${reason}`);
  } finally {
    const uniqueFiles = [...new Set(createdFiles)];
    await Promise.all(uniqueFiles.map((file) => safeDeleteFile(ffmpeg, file)));

    if (paletteFile && !uniqueFiles.includes(paletteFile)) {
      await safeDeleteFile(ffmpeg, paletteFile);
    }

    if (outputFile && !uniqueFiles.includes(outputFile)) {
      await safeDeleteFile(ffmpeg, outputFile);
    }
  }
}
