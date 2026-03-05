import { computeTiming } from '../pathOrder.js';

const DEFAULT_VIEWBOX = '0 0 646 226';

function parseViewBox(viewBox) {
  const parts = String(viewBox || DEFAULT_VIEWBOX).trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return { minX: 0, minY: 0, width: 646, height: 226 };
  }

  return {
    minX: parts[0],
    minY: parts[1],
    width: Math.max(parts[2], 1),
    height: Math.max(parts[3], 1),
  };
}

function multiplyMatrices(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function rotateMatrix(angleDegrees) {
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

function parseTransformValues(raw) {
  return raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite);
}

function buildCommandMatrix(command, values) {
  switch (command) {
    case 'matrix':
      if (values.length === 6) {
        return {
          a: values[0],
          b: values[1],
          c: values[2],
          d: values[3],
          e: values[4],
          f: values[5],
        };
      }
      break;
    case 'translate': {
      const tx = values[0] || 0;
      const ty = values[1] || 0;
      return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
    }
    case 'scale': {
      const sx = values[0] ?? 1;
      const sy = values[1] ?? sx;
      return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
    }
    case 'rotate': {
      const angle = values[0] || 0;
      const cx = values[1] || 0;
      const cy = values[2] || 0;

      const toCenter = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy };
      const rotate = rotateMatrix(angle);
      const fromCenter = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy };
      return multiplyMatrices(multiplyMatrices(toCenter, rotate), fromCenter);
    }
    case 'skewx': {
      const angle = (values[0] || 0) * (Math.PI / 180);
      return { a: 1, b: 0, c: Math.tan(angle), d: 1, e: 0, f: 0 };
    }
    case 'skewy': {
      const angle = (values[0] || 0) * (Math.PI / 180);
      return { a: 1, b: Math.tan(angle), c: 0, d: 1, e: 0, f: 0 };
    }
    default:
      break;
  }

  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function parseSvgTransform(transformString) {
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const normalized = String(transformString || '').trim();
  if (!normalized) return matrix;

  const pattern = /([a-zA-Z]+)\(([^)]*)\)/g;
  let match;
  let current = matrix;

  while ((match = pattern.exec(normalized))) {
    const command = match[1].toLowerCase();
    const values = parseTransformValues(match[2]);
    const commandMatrix = buildCommandMatrix(command, values);
    current = multiplyMatrices(current, commandMatrix);
  }

  return current;
}

export function buildAnimationModel({
  paths,
  clusterMeta,
  animStyle,
  animSpeed,
  viewBox,
  svgTransform,
  isFill,
}) {
  const style = animStyle || 'classic';
  const speed = animSpeed || 1;
  const safePaths = Array.isArray(paths) ? paths : [];
  const safeMeta = Array.isArray(clusterMeta) ? clusterMeta : [];
  const timings = safePaths.map((_, index) => {
    const meta = safeMeta[index] || null;
    return computeTiming(index, meta, style, speed);
  });

  const durationFromTimings = timings.reduce((max, timing) => {
    const tailMultiplier = isFill ? 1.2 : 0.6;
    return Math.max(max, timing.delay + timing.duration * tailMultiplier);
  }, 0);

  const durationForFlow = (() => {
    const s = 1 / speed;
    if (!safeMeta.length) return 2 * s;
    const maxCluster = Math.max(...safeMeta.map((meta) => meta.clusterIndex));
    return (maxCluster + 1) * 0.5 * s + 0.5 * s;
  })();

  const totalDurationSec = Math.max(style === 'flow' ? durationForFlow : durationFromTimings, 0.2);

  return {
    paths: safePaths,
    style,
    speed,
    isFill: Boolean(isFill),
    timings,
    clusterMeta: safeMeta,
    totalDurationSec,
    viewBox: parseViewBox(viewBox || DEFAULT_VIEWBOX),
    svgTransform: svgTransform || '',
    transformMatrix: parseSvgTransform(svgTransform),
    fillColor: '#161311',
  };
}
