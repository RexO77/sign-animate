const DEFAULT_BACKGROUND = '#ffffff';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value) {
  const x = clamp(value, 0, 1);
  return 1 - ((1 - x) ** 3);
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createFrameRenderer(model, {
  maxLongEdge,
  targetFps,
  background = DEFAULT_BACKGROUND,
  maxFrames,
}) {
  const safeTargetFps = Math.max(Number(targetFps) || 1, 1);
  const safeDuration = Math.max(model.totalDurationSec || 0, 1 / safeTargetFps);
  const longEdge = Math.max(Number(maxLongEdge) || 0, 64);

  const viewWidth = Math.max(model.viewBox.width, 1);
  const viewHeight = Math.max(model.viewBox.height, 1);
  const dominantAxis = Math.max(viewWidth, viewHeight);
  const scale = longEdge / dominantAxis;

  const width = Math.max(1, Math.round(viewWidth * scale));
  const height = Math.max(1, Math.round(viewHeight * scale));

  const idealFrames = Math.max(2, Math.ceil(safeDuration * safeTargetFps));
  const frameCap = Math.max(Number(maxFrames) || idealFrames, 2);
  const totalFrames = Math.min(idealFrames, frameCap);
  const effectiveFps = totalFrames / safeDuration;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Could not initialize renderer canvas.');
  }

  const viewScaleX = width / viewWidth;
  const viewScaleY = height / viewHeight;
  const transform = model.transformMatrix || { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const fillColor = model.fillColor || '#161311';
  const compiledPaths = model.paths.map((pathString) => new Path2D(pathString));

  const drawAllPaths = () => {
    for (const path of compiledPaths) {
      ctx.fill(path, 'nonzero');
    }
  };

  const applyViewBoxTransform = () => {
    ctx.scale(viewScaleX, viewScaleY);
    ctx.translate(-model.viewBox.minX, -model.viewBox.minY);
  };

  const applyGroupTransform = () => {
    ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  };

  const renderFlowFrame = (timeSec) => {
    const progress = clamp(timeSec / safeDuration, 0, 1);
    const revealWidth = model.viewBox.width * progress;

    ctx.save();
    ctx.beginPath();
    ctx.rect(model.viewBox.minX, model.viewBox.minY, revealWidth, model.viewBox.height);
    ctx.clip();

    ctx.save();
    applyGroupTransform();
    drawAllPaths();
    ctx.restore();

    ctx.restore();
  };

  const renderStaggeredFrame = (timeSec) => {
    ctx.save();
    applyGroupTransform();

    for (let index = 0; index < compiledPaths.length; index += 1) {
      const timing = model.timings[index];
      if (!timing) continue;

      const duration = Math.max(timing.duration, 0.001);
      const progress = clamp((timeSec - timing.delay) / duration, 0, 1);
      if (progress <= 0) continue;

      ctx.globalAlpha = easeOutCubic(progress);
      ctx.fill(compiledPaths[index], 'nonzero');
    }

    ctx.restore();
  };

  const renderFrameAt = (timeSec) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = fillColor;
    applyViewBoxTransform();

    if (model.style === 'flow') {
      renderFlowFrame(timeSec);
    } else {
      renderStaggeredFrame(timeSec);
    }

    ctx.restore();
  };

  return {
    canvas,
    width,
    height,
    totalFrames,
    durationSec: safeDuration,
    effectiveFps,
    renderFrameAt,
  };
}
