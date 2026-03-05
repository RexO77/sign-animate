import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { Resvg } from '@resvg/resvg-js';
import { buildAnimationModel } from '../../../src/export/animationModel.js';
import { ApiError } from './errors.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value) {
  const x = clamp(value, 0, 1);
  return 1 - ((1 - x) ** 3);
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function computeRenderPlan(model, preset) {
  const safeTargetFps = Math.max(Number(preset.targetFps) || 1, 1);
  const safeDuration = Math.max(model.totalDurationSec || 0, 1 / safeTargetFps);
  const longEdge = Math.max(Number(preset.maxLongEdge) || 0, 64);

  const viewWidth = Math.max(model.viewBox.width, 1);
  const viewHeight = Math.max(model.viewBox.height, 1);
  const dominantAxis = Math.max(viewWidth, viewHeight);
  const scale = longEdge / dominantAxis;

  const width = Math.max(1, Math.round(viewWidth * scale));
  const height = Math.max(1, Math.round(viewHeight * scale));

  const idealFrames = Math.max(2, Math.ceil(safeDuration * safeTargetFps));
  const frameCap = Math.max(Number(preset.maxFrames) || idealFrames, 2);
  const totalFrames = Math.min(idealFrames, frameCap);
  const effectiveFps = totalFrames / safeDuration;

  return {
    width,
    height,
    totalFrames,
    durationSec: safeDuration,
    effectiveFps,
  };
}

function buildFrameSvg(model, plan, preset, timeSec) {
  const { minX, minY, width: viewW, height: viewH } = model.viewBox;
  const groupTransform = model.svgTransform
    ? ` transform="${escapeAttr(model.svgTransform)}"`
    : '';

  const background = preset.background || '#ffffff';

  let body = '';
  if (model.style === 'flow') {
    const progress = clamp(timeSec / plan.durationSec, 0, 1);
    const revealWidth = Math.max(viewW * progress, 0.01);
    const clipId = 'sig-clip';

    const pathsMarkup = model.paths
      .map((d) => `<path d="${escapeAttr(d)}" fill-rule="evenodd"/>`)
      .join('');

    body = `
      <defs>
        <clipPath id="${clipId}">
          <rect x="${minX}" y="${minY}" width="${revealWidth}" height="${viewH}" />
        </clipPath>
      </defs>
      <g clip-path="url(#${clipId})">
        <g${groupTransform} fill="#161311" stroke="none">${pathsMarkup}</g>
      </g>
    `;
  } else {
    const pathMarkup = model.paths.map((d, index) => {
      const timing = model.timings[index];
      if (!timing) return '';
      const duration = Math.max(timing.duration, 0.001);
      const progress = clamp((timeSec - timing.delay) / duration, 0, 1);
      if (progress <= 0) return '';

      const opacity = easeOutCubic(progress);
      return `<path d="${escapeAttr(d)}" fill-rule="evenodd" opacity="${opacity.toFixed(4)}"/>`;
    }).join('');

    body = `<g${groupTransform} fill="#161311" stroke="none">${pathMarkup}</g>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="${minX} ${minY} ${viewW} ${viewH}">
  <rect x="${minX}" y="${minY}" width="${viewW}" height="${viewH}" fill="${escapeAttr(background)}" />
  ${body}
</svg>`;
}

async function runFfmpeg(args, cwd) {
  if (!ffmpegPath) {
    throw new ApiError(500, 'FFMPEG_BINARY_MISSING', 'ffmpeg-static binary is unavailable on this runtime.');
  }

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { cwd });

    let stderr = '';
    let stdout = '';

    process.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    process.on('error', (error) => {
      reject(error);
    });

    process.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function encodeMp4(tempDir, fps) {
  const outputPath = path.join(tempDir, 'output.mp4');

  const h264 = await runFfmpeg([
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-framerate', fps,
    '-i', 'frame_%04d.png',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'output.mp4',
  ], tempDir);

  if (h264.code === 0) {
    return fs.readFile(outputPath);
  }

  const mpeg4 = await runFfmpeg([
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-framerate', fps,
    '-i', 'frame_%04d.png',
    '-c:v', 'mpeg4',
    '-q:v', '3',
    '-pix_fmt', 'yuv420p',
    'output.mp4',
  ], tempDir);

  if (mpeg4.code !== 0) {
    throw new ApiError(502, 'ENCODER_UNAVAILABLE', 'Server encoder could not produce MP4 output.', {
      h264Log: h264.stderr.slice(-1500),
      mpeg4Log: mpeg4.stderr.slice(-1500),
    });
  }

  return fs.readFile(outputPath);
}

async function encodeGif(tempDir, fps) {
  const outputPath = path.join(tempDir, 'output.gif');

  const paletteGen = await runFfmpeg([
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-framerate', fps,
    '-i', 'frame_%04d.png',
    '-vf', 'palettegen=stats_mode=single:max_colors=256',
    'palette.png',
  ], tempDir);

  if (paletteGen.code === 0) {
    const paletteUse = await runFfmpeg([
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-framerate', fps,
      '-i', 'frame_%04d.png',
      '-i', 'palette.png',
      '-lavfi', 'paletteuse=dither=sierra2_4a',
      '-loop', '0',
      'output.gif',
    ], tempDir);

    if (paletteUse.code === 0) {
      return fs.readFile(outputPath);
    }
  }

  const fallback = await runFfmpeg([
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-framerate', fps,
    '-i', 'frame_%04d.png',
    '-loop', '0',
    'output.gif',
  ], tempDir);

  if (fallback.code !== 0) {
    throw new ApiError(502, 'ENCODE_NONZERO_EXIT', 'Server encoder could not produce GIF output.', {
      paletteLog: paletteGen.stderr.slice(-1500),
      fallbackLog: fallback.stderr.slice(-1500),
    });
  }

  return fs.readFile(outputPath);
}

export async function encodeWithLocalWorker(payload, { onProgress } = {}) {
  const startedAt = Date.now();
  const model = buildAnimationModel(payload.animation);
  const plan = computeRenderPlan(model, payload.preset);

  if (plan.totalFrames * plan.width * plan.height > 260_000_000) {
    throw new ApiError(413, 'JOB_TOO_LARGE', 'Export is too large for local fallback worker.');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'signanimate-export-'));

  try {
    for (let index = 0; index < plan.totalFrames; index += 1) {
      const progress = plan.totalFrames === 1
        ? 1
        : index / (plan.totalFrames - 1);
      const timeSec = progress * plan.durationSec;
      const frameSvg = buildFrameSvg(model, plan, payload.preset, timeSec);
      const pngBuffer = new Resvg(frameSvg).render().asPng();
      const framePath = path.join(tempDir, `frame_${String(index).padStart(4, '0')}.png`);
      await fs.writeFile(framePath, pngBuffer);
      onProgress?.((index + 1) / plan.totalFrames);
    }

    const fps = String(Math.max(plan.effectiveFps, 1).toFixed(3)).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

    let fileBuffer;
    let mimeType;
    let filename;

    if (payload.format === 'mp4') {
      fileBuffer = await encodeMp4(tempDir, fps);
      mimeType = 'video/mp4';
      filename = 'signature.mp4';
    } else {
      fileBuffer = await encodeGif(tempDir, fps);
      mimeType = 'image/gif';
      filename = 'signature.gif';
    }

    if (!fileBuffer?.length) {
      throw new ApiError(502, 'OUTPUT_MISSING', 'Local worker did not produce an output file.');
    }

    return {
      route: 'local-worker',
      filename,
      mimeType,
      fileBuffer,
      durationMs: Date.now() - startedAt,
      metrics: {
        totalFrames: plan.totalFrames,
        width: plan.width,
        height: plan.height,
        effectiveFps: Number(plan.effectiveFps.toFixed(3)),
      },
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
