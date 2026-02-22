import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, RefreshCw, Pencil, Image as ImageIcon, Undo, Trash2, Play, SlidersHorizontal, Gauge, RotateCcw } from 'lucide-react';
import { orderPaths, computeTiming } from './pathOrder';

// ─── MATH & DRAWING HELPERS ───────────────────────────────────────────────────
const CANVAS_W = 600;
const CANVAS_H = 200;
const INK_COLOR = '#0f172a'; // slate-900
const MIN_WIDTH = 1.2;
const MAX_WIDTH = 5.5;
const SMOOTHING = 0.18;
const TAPER_LENGTH = 12;
const VELOCITY_WEIGHT = 0.55;

function lerp(a, b, t) { return a + (b - a) * t; }
function dist(a, b) { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2); }

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function buildOutlinePath(points) {
  if (points.length < 2) return null;
  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x, ty = next.y - prev.y;
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len, ny = tx / len;
    const hw = points[i].w / 2;
    left.push({ x: points[i].x + nx * hw, y: points[i].y + ny * hw });
    right.push({ x: points[i].x - nx * hw, y: points[i].y - ny * hw });
  }
  return { left, right };
}

function drawOutline(ctx, left, right) {
  if (!left || !left.length) return;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  const last = left[left.length - 1], lastR = right[right.length - 1];
  ctx.quadraticCurveTo((last.x + lastR.x) / 2, (last.y + lastR.y) / 2, lastR.x, lastR.y);
  for (let i = right.length - 2; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  const first = right[0], firstL = left[0];
  ctx.quadraticCurveTo((first.x + firstL.x) / 2, (first.y + firstL.y) / 2, firstL.x, firstL.y);
  ctx.closePath();
  ctx.fill();
}

function processStroke(rawPoints) {
  if (rawPoints.length < 2) return [];
  const withWidth = rawPoints.map((p, i) => {
    if (i === 0) return { ...p, w: MIN_WIDTH };
    const d = dist(p, rawPoints[i - 1]), dt = Math.max(p.t - rawPoints[i - 1].t, 1);
    const speed = d / dt, normalized = Math.min(speed / 2, 1);
    const w = lerp(MAX_WIDTH, MIN_WIDTH, normalized * VELOCITY_WEIGHT + (1 - VELOCITY_WEIGHT) * 0.3);
    return { ...p, w };
  });

  const smoothed = withWidth.map((p, i) => {
    const win = withWidth.slice(Math.max(0, i - 3), i + 4);
    const avgW = win.reduce((s, q) => s + q.w, 0) / win.length;
    return { ...p, w: lerp(p.w, avgW, 0.5) };
  });

  const n = smoothed.length;
  for (let i = 0; i < Math.min(TAPER_LENGTH, n); i++) {
    const ease = (i / TAPER_LENGTH) * (i / TAPER_LENGTH) * (3 - 2 * (i / TAPER_LENGTH));
    smoothed[i].w = lerp(MIN_WIDTH * 0.5, smoothed[i].w, ease);
    smoothed[n - 1 - i].w = lerp(MIN_WIDTH * 0.5, smoothed[n - 1 - i].w, ease);
  }

  const splined = [];
  for (let i = 0; i < smoothed.length - 1; i++) {
    const p0 = smoothed[Math.max(0, i - 1)], p1 = smoothed[i];
    const p2 = smoothed[i + 1], p3 = smoothed[Math.min(smoothed.length - 1, i + 2)];
    const steps = Math.max(4, Math.floor(dist(p1, p2) / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      splined.push({ ...catmullRom(p0, p1, p2, p3, t), w: lerp(p1.w, p2.w, t) });
    }
  }
  return splined;
}

function renderStroke(ctx, processed) {
  if (!processed.length) return;
  const outline = buildOutlinePath(processed);
  if (!outline) return;
  ctx.fillStyle = INK_COLOR;
  drawOutline(ctx, outline.left, outline.right);
}

function strokeToSVGPath(processed) {
  if (processed.length < 2) return '';
  const outline = buildOutlinePath(processed);
  if (!outline) return '';
  const { left, right } = outline;
  const fmt = (n) => Math.round(n * 10) / 10;
  let d = `M ${fmt(left[0].x)} ${fmt(left[0].y)}`;
  for (let i = 1; i < left.length; i++) d += ` L ${fmt(left[i].x)} ${fmt(left[i].y)}`;
  const last = left[left.length - 1], lastR = right[right.length - 1];
  d += ` Q ${fmt((last.x + lastR.x) / 2)} ${fmt((last.y + lastR.y) / 2)}, ${fmt(lastR.x)} ${fmt(lastR.y)}`;
  for (let i = right.length - 2; i >= 0; i--) d += ` L ${fmt(right[i].x)} ${fmt(right[i].y)}`;
  const first = right[0], firstL = left[0];
  d += ` Q ${fmt((first.x + firstL.x) / 2)} ${fmt((first.y + firstL.y) / 2)}, ${fmt(firstL.x)} ${fmt(firstL.y)} Z`;
  return d;
}

function getPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY, t: Date.now() };
}

// ─── ANIMATION STYLES ─────────────────────────────────────────────────────────
const ANIMATION_STYLES = [
  { id: 'letter', label: 'Letter by Letter', icon: '✍️' },
  { id: 'flow', label: 'Continuous', icon: '〰️' },
  { id: 'classic', label: 'Classic', icon: '▶️' },
];

// ─── SIGNATURE SVG COMPONENT ──────────────────────────────────────────────────
const Signature = ({ paths, isFill, viewBox, className, clusterMeta, animStyle, animSpeed, animKey, ...props }) => {
  const style = animStyle || 'classic';
  const speed = animSpeed || 1;
  const s = 1 / speed;

  // Total animation duration for clip-path reveal
  const totalDuration = (() => {
    if (!clusterMeta?.length) return 2 * s;
    const maxCluster = Math.max(...clusterMeta.map(m => m.clusterIndex));
    return (maxCluster + 1) * 0.5 * s + 0.5 * s;
  })();

  // ── UPLOAD MODE: filled contour paths from ImageTracer ──
  // pathLength looks bad on these → use opacity reveals + clip-path wipe
  if (!isFill) {
    if (style === 'flow') {
      // Continuous L→R clip-path wipe — smoothest "handwriting" feel
      return (
        <motion.svg
          key={animKey}
          viewBox={viewBox || "0 0 646 226"}
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          className={`h-auto w-full overflow-hidden drop-shadow-md ${className || ''}`}
          {...props}
        >
          <defs>
            <clipPath id={`reveal-${animKey}`}>
              <motion.rect
                x="0" y="0"
                height="100%"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: totalDuration, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#reveal-${animKey})`}>
            {paths.map((d, i) => (
              <path key={i} d={d} stroke="none" />
            ))}
          </g>
        </motion.svg>
      );
    }

    // Letter-by-letter or Classic: fade in paths/clusters sequentially
    return (
      <motion.svg
        key={animKey}
        viewBox={viewBox || "0 0 646 226"}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-auto w-full overflow-hidden drop-shadow-md ${className || ''}`}
        {...props}
      >
        {paths.map((d, i) => {
          const meta = clusterMeta?.[i] || null;
          const { delay, duration } = computeTiming(i, meta, style, speed);
          return (
            <motion.path
              key={i}
              d={d}
              stroke="none"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                opacity: { duration: duration * 0.4, delay, ease: 'easeOut' },
                scale: { duration: duration * 0.6, delay, ease: 'easeOut' },
              }}
            />
          );
        })}
      </motion.svg>
    );
  }

  // ── DRAW MODE: stroke-outline paths — pathLength animation looks great here ──
  return (
    <motion.svg
      key={animKey}
      viewBox={viewBox || `0 0 ${CANVAS_W} ${CANVAS_H}`}
      fill="currentColor"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-auto w-full overflow-hidden drop-shadow-md ${className || ''}`}
      {...props}
    >
      {paths.map((pathString, i) => {
        const meta = clusterMeta?.[i] || null;
        const { delay, duration } = computeTiming(i, meta, style, speed);
        return (
          <motion.path
            key={`draw-${i}`}
            d={pathString}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0, pathLength: 0, fillOpacity: 0 }}
            animate={{
              opacity: 1, pathLength: 1, fillOpacity: 1,
              transition: {
                opacity: { duration: 0.01, delay },
                pathLength: { ease: 'easeInOut', duration, delay },
                fillOpacity: { duration: duration * 0.6, delay: delay + duration * 0.6 },
              },
            }}
          />
        );
      })}
    </motion.svg>
  );
};

// ─── MAIN APP COMPONENT ───────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'draw'
  const [animatedPaths, setAnimatedPaths] = useState([]);
  const [clusterMeta, setClusterMeta] = useState([]);
  const [svgViewBox, setSvgViewBox] = useState("0 0 646 226");
  const [isFillMode, setIsFillMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sensitivity, setSensitivity] = useState(180);
  const [animStyle, setAnimStyle] = useState('letter');
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animKey, setAnimKey] = useState(0); // increment to replay
  const uploadedImageRef = useRef(null);

  // Draw Canvas State
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const rawPoints = useRef([]);
  const lastSmoothed = useRef({ x: 0, y: 0 });
  const finishedRef = useRef([]);
  const [finishedStrokes, setFinishedStrokes] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/gh/jankovicsandras/imagetracerjs@master/imagetracer_v1.2.6.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // --- UPLOAD LOGIC ---
  const reprocessImage = useCallback((threshold) => {
    const cached = uploadedImageRef.current;
    if (!cached || !window.ImageTracer) return;

    const { sourceCanvas, width, height } = cached;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceCanvas, 0, 0);

    // Step 1: Threshold — separate ink from paper
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (luma > threshold) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; }
      else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; }
    }
    ctx.putImageData(imageData, 0, 0);

    // Step 2: Gaussian blur to soften staircase edges BEFORE tracing
    // This is the key to smooth curves — blurred edges produce smooth vector outlines
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = width;
    blurCanvas.height = height;
    const blurCtx = blurCanvas.getContext('2d', { willReadFrequently: true });
    blurCtx.filter = 'blur(1.5px)';
    blurCtx.drawImage(tempCanvas, 0, 0);
    blurCtx.filter = 'none';

    // Step 3: Re-threshold the blurred result to get clean but softened edges
    const blurredData = blurCtx.getImageData(0, 0, width, height);
    const bd = blurredData.data;
    for (let i = 0; i < bd.length; i += 4) {
      const luma = bd[i] * 0.299 + bd[i + 1] * 0.587 + bd[i + 2] * 0.114;
      if (luma > 140) bd[i + 3] = 0;  // transparent (paper)
      else { bd[i] = 0; bd[i + 1] = 0; bd[i + 2] = 0; bd[i + 3] = 255; } // black (ink)
    }

    // Step 4: Trace with smoother curve settings
    const svgString = window.ImageTracer.imagedataToSVG(blurredData, {
      ltres: 2,        // line threshold — higher = smoother (was 0.5)
      qtres: 1.5,      // quadratic spline threshold — higher = smoother (was 0.5)
      pathomit: 8,     // omit tiny noise paths
      rightangleenhance: false,  // don't sharpen corners
      blurradius: 2,   // additional built-in blur
      blurdelta: 30,
      scale: 1,
    });
    const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");

    // Only keep paths with a dark fill (ink), discard light/transparent background paths
    const extractedPaths = Array.from(doc.querySelectorAll('path'))
      .filter(p => {
        const fill = p.getAttribute('fill') || '';
        // Parse rgb(r,g,b) fill colors from ImageTracer output
        const rgb = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgb) return fill !== 'none' && fill !== '' && fill !== 'white' && fill !== '#ffffff' && fill !== '#fff';
        const r = parseInt(rgb[1]), g = parseInt(rgb[2]), b = parseInt(rgb[3]);
        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        return luma < 128; // Only keep genuinely dark (ink) paths
      })
      .map(p => p.getAttribute('d'))
      .filter(d => d && d.length > 10);

    const svgElement = doc.querySelector('svg');
    if (svgElement) setSvgViewBox(svgElement.getAttribute('viewBox') || `0 0 ${width} ${height}`);

    // Order paths left-to-right with clustering
    const { orderedPaths: sorted, clusterMeta: meta } = orderPaths(extractedPaths);

    setIsFillMode(false);
    setAnimatedPaths(sorted);
    setClusterMeta(meta);
    setAnimKey(k => k + 1);
  }, []);

  const processUpload = (file) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const scale = Math.min(800 / img.width, 400 / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Fill white background first to prevent transparent PNGs turning black
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Cache the clean source canvas for re-processing with different thresholds
        uploadedImageRef.current = { sourceCanvas: canvas, width: canvas.width, height: canvas.height };
        setSensitivity(180); // reset slider to default

        if (window.ImageTracer) {
          reprocessImage(180);
          setIsProcessing(false);
        } else {
          alert("Tracing library hasn't loaded yet. Try again!");
          setIsProcessing(false);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- DRAWING LOGIC ---
  const fullRedraw = useCallback((strokes) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    strokes.forEach(s => renderStroke(ctx, s));
  }, []);

  const startStroke = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e, canvasRef.current);
    isDrawing.current = true;
    rawPoints.current = [pos];
    lastSmoothed.current = pos;
    setHasDrawn(true);
  }, []);

  const continueStroke = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getPos(e, canvasRef.current);
    const sx = lerp(pos.x, lastSmoothed.current.x, SMOOTHING);
    const sy = lerp(pos.y, lastSmoothed.current.y, SMOOTHING);
    lastSmoothed.current = { x: sx, y: sy };
    rawPoints.current.push({ x: sx, y: sy, t: pos.t });
    if (rawPoints.current.length < 4) return;
    fullRedraw(finishedRef.current);
    renderStroke(canvasRef.current.getContext('2d'), processStroke(rawPoints.current));
  }, [fullRedraw]);

  const endStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (rawPoints.current.length < 2) return;
    const next = [...finishedRef.current, processStroke(rawPoints.current)];
    finishedRef.current = next;
    setFinishedStrokes(next);
    fullRedraw(next);
    rawPoints.current = [];
  }, [fullRedraw]);

  const animateDrawing = () => {
    if (!finishedStrokes.length) return;
    const paths = finishedStrokes.map(s => strokeToSVGPath(s));
    // Drawn strokes are already in natural order — still cluster for timing
    const { orderedPaths: sorted, clusterMeta: meta } = orderPaths(paths);
    setIsFillMode(true);
    setAnimatedPaths(sorted);
    setClusterMeta(meta);
    setAnimKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6 text-slate-800 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8 sm:p-12">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-3">Signature Animator</h1>

          {/* Tabs */}
          {animatedPaths.length === 0 && (
            <div className="inline-flex bg-slate-100 p-1 rounded-xl mx-auto mt-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ImageIcon className="w-4 h-4" /> Upload
              </button>
              <button
                onClick={() => setActiveTab('draw')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'draw' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Pencil className="w-4 h-4" /> Draw Manually
              </button>
            </div>
          )}
        </div>

        {/* RESULTS VIEW */}
        {animatedPaths.length > 0 ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-2xl bg-[#fefcf8] rounded-2xl p-8 border border-slate-200 flex items-center justify-center min-h-[300px] shadow-inner">
              <Signature
                paths={animatedPaths}
                isFill={isFillMode}
                viewBox={isFillMode ? `0 0 ${CANVAS_W} ${CANVAS_H}` : svgViewBox}
                className="text-slate-900 w-full"
                clusterMeta={clusterMeta}
                animStyle={animStyle}
                animSpeed={animSpeed}
                animKey={animKey}
              />
            </div>

            {/* ── Animation Controls ── */}
            <div className="w-full max-w-lg mt-6 space-y-4">

              {/* Animation Style Picker */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Animation Style</p>
                <div className="flex gap-2">
                  {ANIMATION_STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setAnimStyle(s.id); setAnimKey(k => k + 1); }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${animStyle === s.id
                        ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      <span>{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed + Replay Row */}
              <div className="flex items-end gap-3">
                <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <Gauge className="w-3.5 h-3.5" /> Speed
                    </label>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{animSpeed}×</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.25"
                    value={animSpeed}
                    onChange={(e) => { setAnimSpeed(Number(e.target.value)); setAnimKey(k => k + 1); }}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-800"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
                <button
                  onClick={() => setAnimKey(k => k + 1)}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
              </div>

              {/* Sensitivity slider — only for uploaded images */}
              {uploadedImageRef.current && !isFillMode && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Sensitivity
                    </label>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{sensitivity}</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="240"
                    value={sensitivity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSensitivity(val);
                      reprocessImage(val);
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-800"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Less ink</span>
                    <span>More ink</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => { setAnimatedPaths([]); setClusterMeta([]); uploadedImageRef.current = null; }}
              className="mt-8 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-slate-800 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> Try Another
            </button>
          </div>
        ) : (
          /* INPUT VIEWS */
          <div className="w-full max-w-2xl mx-auto">
            {activeTab === 'upload' ? (
              <form
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault(); e.stopPropagation(); setDragActive(false);
                  if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0]);
                }}
                className={`relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'} ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && processUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isProcessing} />
                {isProcessing ? (
                  <div className="flex flex-col items-center text-blue-600"><Loader2 className="w-10 h-10 animate-spin mb-4" /><p className="font-medium">Digitizing...</p></div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500 pointer-events-none">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4"><Upload className="w-8 h-8 text-slate-700" /></div>
                    <p className="font-semibold text-slate-700 text-lg">Drop image here</p>
                    <p className="text-sm mt-1">SVG, PNG, JPG or GIF</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-[#fefcf8] shadow-inner touch-none">
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="w-full h-auto cursor-crosshair block"
                    onMouseDown={startStroke} onMouseMove={continueStroke} onMouseUp={endStroke} onMouseLeave={endStroke}
                    onTouchStart={startStroke} onTouchMove={continueStroke} onTouchEnd={endStroke}
                  />
                  {!hasDrawn && <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-serif italic text-xl pointer-events-none">Sign here</div>}
                </div>

                <div className="w-full flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    <button onClick={() => { finishedRef.current.pop(); setFinishedStrokes([...finishedRef.current]); fullRedraw(finishedRef.current); if (!finishedRef.current.length) setHasDrawn(false); }} disabled={!finishedStrokes.length} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"><Undo className="w-4 h-4" /> Undo</button>
                    <button onClick={() => { finishedRef.current = []; setFinishedStrokes([]); fullRedraw([]); setHasDrawn(false); }} disabled={!finishedStrokes.length} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /> Clear</button>
                  </div>

                  <button onClick={animateDrawing} disabled={!finishedStrokes.length} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm">
                    <Play className="w-4 h-4 fill-current" /> Animate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
