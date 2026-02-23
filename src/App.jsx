import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, RefreshCw, Pencil, Image as ImageIcon, Undo, Trash2, Play, SlidersHorizontal, Gauge, RotateCcw, Settings, Download, X, Check, Copy, ChevronDown, ChevronUp, PenTool, Code, FileImage } from 'lucide-react';
import { orderPaths, computeTiming, getPathBBox } from './pathOrder';

// ─── MATH & DRAWING HELPERS ───────────────────────────────────────────────────
const CANVAS_W = 600;
const CANVAS_H = 200;
const INK_COLOR = '#0f172a';
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

// ─── BUTTON COMPONENT ─────────────────────────────────────────────────────────
const Button = ({ children, variant = 'default', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-[#3777FF] text-white hover:bg-[#2b66e6] focus:ring-[#3777FF]/40 shadow-sm hover:shadow-md',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-[#FFE9CE]/40',
    outline: 'border border-slate-200 text-slate-700 hover:bg-[#FFE9CE]/30 hover:border-[#FFBE86]/50',
    danger: 'text-red-600 bg-red-50 hover:bg-red-100 focus:ring-red-300',
    primary: 'bg-[#3777FF] text-white hover:bg-[#2b66e6] focus:ring-[#3777FF]/40 shadow-sm hover:shadow-md',
    export: 'bg-[#FFBE86] text-slate-900 hover:bg-[#f5ad72] focus:ring-[#FFBE86]/40 shadow-sm hover:shadow-md font-semibold',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// ─── EXPORT SNIPPET GENERATOR ─────────────────────────────────────────────────
function generateExportSnippet({ paths, isFill, viewBox, svgTransform, animStyle, animSpeed, clusterMeta }) {
  const speed = animSpeed || 1;
  const s = 1 / speed;
  const vb = isFill ? `0 0 ${CANVAS_W} ${CANVAS_H}` : (viewBox || '0 0 646 226');
  const fillColor = '#0f172a';

  if (animStyle === 'flow' || (animStyle === 'flow' && !isFill)) {
    const maxCluster = clusterMeta?.length
      ? Math.max(...clusterMeta.map(m => m.clusterIndex))
      : 0;
    const totalDuration = ((maxCluster + 1) * 0.5 * s + 0.5 * s).toFixed(2);

    const pathsMarkup = paths.map((d, i) =>
      `      <path d="${d}" fill-rule="evenodd"/>`
    ).join('\n');

    const innerGroup = svgTransform && !isFill
      ? `    <g class="sig-paths" clip-path="url(#sig-reveal)">\n      <g transform="${svgTransform}" fill="${fillColor}" stroke="none">\n${pathsMarkup}\n      </g>\n    </g>`
      : `    <g class="sig-paths" clip-path="url(#sig-reveal)" fill="${fillColor}" stroke="none">\n${pathsMarkup}\n    </g>`;

    return `<!-- Signature Animation — generated by Signature Animator -->
<div style="max-width:500px;">
  <svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;overflow:hidden;">
    <style>
      @keyframes sigReveal {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
      .sig-reveal-rect { animation: sigReveal ${totalDuration}s cubic-bezier(0.25,0.1,0.25,1) forwards; }
    </style>
    <defs>
      <clipPath id="sig-reveal">
        <rect x="0" y="0" width="100%" height="100%" class="sig-reveal-rect" style="transform:translateX(-100%);"/>
      </clipPath>
    </defs>
${innerGroup}
  </svg>
</div>`;
  }

  // Letter-by-letter or Classic: use per-path opacity + animation-delay
  const pathLines = paths.map((d, i) => {
    const meta = clusterMeta?.[i] || null;
    const { delay, duration } = computeTiming(i, meta, animStyle, speed);
    return `      <path d="${d}" fill-rule="evenodd" class="sig-p" style="animation-delay:${delay.toFixed(3)}s;animation-duration:${(duration * 0.4).toFixed(3)}s;"/>`;
  }).join('\n');

  const innerGroup = svgTransform && !isFill
    ? `    <g transform="${svgTransform}" fill="${fillColor}" stroke="none">\n${pathLines}\n    </g>`
    : `    <g fill="${fillColor}" stroke="none">\n${pathLines}\n    </g>`;

  return `<!-- Signature Animation — generated by Signature Animator -->
<div style="max-width:500px;">
  <svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;overflow:hidden;">
    <style>
      @keyframes sigFadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1); }
      }
      .sig-p {
        opacity: 0;
        animation-name: sigFadeIn;
        animation-fill-mode: forwards;
        animation-timing-function: ease-out;
      }
    </style>
${innerGroup}
  </svg>
</div>`;
}

// ─── STATIC SVG GENERATOR (for image export) ─────────────────────────────────
function generateStaticSVG({ paths, isFill, viewBox, svgTransform }) {
  const vb = isFill ? `0 0 ${CANVAS_W} ${CANVAS_H}` : (viewBox || '0 0 646 226');
  const fillColor = '#0f172a';

  const pathsMarkup = paths.map(d =>
    `    <path d="${d}" fill-rule="evenodd"/>`
  ).join('\n');

  const innerGroup = svgTransform && !isFill
    ? `  <g transform="${svgTransform}" fill="${fillColor}" stroke="none">\n${pathsMarkup}\n  </g>`
    : `  <g fill="${fillColor}" stroke="none">\n${pathsMarkup}\n  </g>`;

  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">\n${innerGroup}\n</svg>`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPNG(svgString, scale = 3) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  const vb = svgEl?.getAttribute('viewBox')?.split(/\s+/).map(Number) || [0, 0, 600, 200];
  const w = vb[2], h = vb[3];

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'signature.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = url;
}

// ─── EXPORT MODAL ─────────────────────────────────────────────────────────────
function ExportModal({ snippet, staticSVG, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeExportTab, setActiveExportTab] = useState('code');
  const textareaRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      textareaRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSVG = () => downloadFile(staticSVG, 'signature.svg', 'image/svg+xml');
  const handleDownloadPNG = () => downloadPNG(staticSVG, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 font-display">Export Signature</h3>
            <p className="text-sm text-slate-500 mt-0.5">Download as image or grab the embeddable code</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2 rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-0">
          <div className="inline-flex bg-[#FFE9CE]/40 p-1 rounded-xl">
            {[
              { id: 'code', label: 'Code Snippet', Icon: Code },
              { id: 'image', label: 'Image', Icon: FileImage },
            ].map(tab => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveExportTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeExportTab === tab.id
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.Icon className="w-4 h-4" /> {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeExportTab === 'code' ? (
            <motion.div
              key="code-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Preview */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                <div className="paper-texture rounded-xl p-6 border border-slate-200 flex items-center justify-center">
                  <div
                    className="w-full max-w-sm"
                    dangerouslySetInnerHTML={{ __html: snippet }}
                  />
                </div>
              </div>

              {/* Code */}
              <div className="px-6 pt-3 pb-4 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Embeddable Code</p>
                  <Button
                    variant={copied ? 'export' : 'outline'}
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                </div>
                <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-4 min-h-0">
                  <pre className="code-block text-slate-300 whitespace-pre-wrap break-all">{snippet}</pre>
                  <textarea
                    ref={textareaRef}
                    value={snippet}
                    readOnly
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-[#FFE9CE]/50 bg-[#FFE9CE]/15 flex items-center justify-between">
                <p className="text-xs text-slate-400">No external dependencies required</p>
                <Button variant="primary" onClick={handleCopy} className="px-5 py-2.5 rounded-xl text-sm">
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="image-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Image preview */}
              <div className="px-6 pt-4 pb-4 flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                <div className="paper-texture rounded-xl p-8 border border-slate-200 flex items-center justify-center min-h-[200px]">
                  <div
                    className="w-full max-w-md"
                    dangerouslySetInnerHTML={{ __html: staticSVG }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  PNG exports at 3× resolution for crisp display on retina screens
                </p>
              </div>

              {/* Download buttons */}
              <div className="px-6 py-4 border-t border-[#FFE9CE]/50 bg-[#FFE9CE]/15 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleDownloadSVG} className="px-5 py-2.5 rounded-xl text-sm">
                  <Download className="w-4 h-4" /> Download SVG
                </Button>
                <Button variant="primary" onClick={handleDownloadPNG} className="px-5 py-2.5 rounded-xl text-sm">
                  <FileImage className="w-4 h-4" /> Download PNG
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── SIGNATURE SVG COMPONENT ──────────────────────────────────────────────────
const Signature = ({ paths, isFill, viewBox, className, clusterMeta, animStyle, animSpeed, animKey, svgTransform, ...props }) => {
  const style = animStyle || 'classic';
  const speed = animSpeed || 1;
  const s = 1 / speed;

  const totalDuration = (() => {
    if (!clusterMeta?.length) return 2 * s;
    const maxCluster = Math.max(...clusterMeta.map(m => m.clusterIndex));
    return (maxCluster + 1) * 0.5 * s + 0.5 * s;
  })();

  if (!isFill) {
    if (style === 'flow') {
      return (
        <motion.svg
          key={animKey}
          viewBox={viewBox || "0 0 646 226"}
          xmlns="http://www.w3.org/2000/svg"
          className={`h-auto w-full overflow-hidden ${className || ''}`}
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
            <g transform={svgTransform || undefined} fill="#000000" stroke="none">
              {paths.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>
          </g>
        </motion.svg>
      );
    }

    return (
      <motion.svg
        key={animKey}
        viewBox={viewBox || "0 0 646 226"}
        xmlns="http://www.w3.org/2000/svg"
        className={`h-auto w-full overflow-hidden ${className || ''}`}
        {...props}
      >
        <g transform={svgTransform || undefined} fill="#000000" stroke="none">
          {paths.map((d, i) => {
            const meta = clusterMeta?.[i] || null;
            const { delay, duration } = computeTiming(i, meta, style, speed);
            return (
              <motion.path
                key={i}
                d={d}
                fillRule="evenodd"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  opacity: { duration: duration * 0.4, delay, ease: 'easeOut' },
                  scale: { duration: duration * 0.6, delay, ease: 'easeOut' },
                }}
              />
            );
          })}
        </g>
      </motion.svg>
    );
  }

  return (
    <motion.svg
      key={animKey}
      viewBox={viewBox || `0 0 ${CANVAS_W} ${CANVAS_H}`}
      fill="currentColor"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-auto w-full overflow-hidden ${className || ''}`}
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
  const [activeTab, setActiveTab] = useState('upload');
  const [animatedPaths, setAnimatedPaths] = useState([]);
  const [clusterMeta, setClusterMeta] = useState([]);
  const [svgViewBox, setSvgViewBox] = useState("0 0 646 226");
  const [svgTransform, setSvgTransform] = useState('');
  const [isFillMode, setIsFillMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sensitivity, setSensitivity] = useState(180);
  const [animStyle, setAnimStyle] = useState('letter');
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const uploadedImageRef = useRef(null);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const rawPoints = useRef([]);
  const lastSmoothed = useRef({ x: 0, y: 0 });
  const finishedRef = useRef([]);
  const [finishedStrokes, setFinishedStrokes] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const potraceReady = useRef(false);
  useEffect(() => {
    import('esm-potrace-wasm').then(async (mod) => {
      await mod.init();
      potraceReady.current = true;
      window.__potrace = mod.potrace;
    });
  }, []);

  // --- UPLOAD LOGIC ---
  const reprocessImage = useCallback(async (threshold) => {
    const cached = uploadedImageRef.current;
    if (!cached || !potraceReady.current) return;

    const { sourceCanvas, width, height } = cached;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceCanvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (luma > threshold) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; }
      else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; }
    }
    ctx.putImageData(imageData, 0, 0);

    const svgString = await window.__potrace(tempCanvas, {
      turdsize: 2,
      opttolerance: 0.4,
      alphamax: 1.2,
      opticurve: true,
    });

    const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");

    const gElement = doc.querySelector('g');
    const transform = gElement?.getAttribute('transform') || '';
    setSvgTransform(transform);

    const scale = 10;
    const extractedPaths = [];
    for (const g of doc.querySelectorAll('g')) {
      const fill = (g.getAttribute('fill') || '').toUpperCase();
      if (fill === '#FFFFFF' || fill === 'WHITE') continue;

      for (const p of g.querySelectorAll('path')) {
        const d = p.getAttribute('d');
        if (!d || d.length <= 10) continue;

        const bbox = getPathBBox(d);
        if (bbox && bbox.w > width * scale * 0.85 && bbox.h > height * scale * 0.85) continue;

        extractedPaths.push(d);
      }
    }

    const svgElement = doc.querySelector('svg');
    if (svgElement) {
      const w = svgElement.getAttribute('width');
      const h = svgElement.getAttribute('height');
      const vb = svgElement.getAttribute('viewBox') || `0 0 ${w || width} ${h || height}`;
      setSvgViewBox(vb);
    }

    const { orderedPaths: sorted, clusterMeta: meta } = orderPaths(extractedPaths);

    setIsFillMode(false);
    setAnimatedPaths(sorted);
    setClusterMeta(meta);
    setAnimKey(k => k + 1);
  }, []);

  const processUpload = async (file) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const scale = Math.min(800 / img.width, 400 / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        uploadedImageRef.current = { sourceCanvas: canvas, width: canvas.width, height: canvas.height };
        setSensitivity(180);

        if (potraceReady.current) {
          await reprocessImage(180);
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
    const { orderedPaths: sorted, clusterMeta: meta } = orderPaths(paths);
    setIsFillMode(true);
    setAnimatedPaths(sorted);
    setClusterMeta(meta);
    setAnimKey(k => k + 1);
  };

  const handleReset = () => {
    setAnimatedPaths([]);
    setClusterMeta([]);
    setSvgTransform('');
    setShowControls(false);
    setShowExport(false);
    uploadedImageRef.current = null;
  };

  const exportParams = {
    paths: animatedPaths,
    isFill: isFillMode,
    viewBox: isFillMode ? `0 0 ${CANVAS_W} ${CANVAS_H}` : svgViewBox,
    svgTransform: isFillMode ? '' : svgTransform,
  };

  const exportSnippet = generateExportSnippet({ ...exportParams, animStyle, animSpeed, clusterMeta });
  const staticSVG = generateStaticSVG(exportParams);

  const hasResults = animatedPaths.length > 0;

  return (
    <div className="min-h-screen page-bg flex flex-col font-body">
      {/* ── Header ── */}
      <header className="w-full py-6 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3777FF] rounded-xl flex items-center justify-center shadow-sm shadow-[#3777FF]/20">
              <PenTool className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">Signature Animator</h1>
              <p className="text-xs text-slate-400 tracking-wide">Turn any signature into a living animation</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center px-6 pb-12">
        <motion.div
          layout
          className="max-w-4xl w-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-[#FFBE86]/20 p-8 sm:p-12"
        >
          {/* Title area — only when no results */}
          <AnimatePresence mode="wait">
            {!hasResults && (
              <motion.div
                key="input-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-display font-semibold text-slate-800 mb-2">
                  {activeTab === 'upload' ? 'Upload Your Signature' : 'Draw Your Signature'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {activeTab === 'upload' ? 'Drop an image to digitize and animate' : 'Sign with your mouse or finger, then animate'}
                </p>

                {/* Tabs */}
                <div className="inline-flex bg-[#FFE9CE]/50 p-1 rounded-xl mx-auto mt-6">
                  {[
                    { id: 'upload', label: 'Upload', Icon: ImageIcon },
                    { id: 'draw', label: 'Draw', Icon: Pencil },
                  ].map(tab => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        activeTab === tab.id
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.Icon className="w-4 h-4" /> {tab.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── RESULTS VIEW ── */}
          <AnimatePresence mode="wait">
            {hasResults ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="flex flex-col items-center"
              >
                {/* Paper-on-desk preview */}
                <div className="relative w-full max-w-2xl mx-auto">
                  {/* Background shadow cards for depth */}
                  <div className="absolute inset-0 bg-[#FFB5C2]/20 rounded-2xl rotate-[0.8deg] translate-x-1 translate-y-1" />
                  <div className="absolute inset-0 bg-[#FFE9CE]/40 rounded-2xl -rotate-[0.5deg] -translate-x-0.5 translate-y-0.5" />
                  <div className="relative paper-texture rounded-2xl p-8 border border-[#FFBE86]/25 flex items-center justify-center min-h-[260px] shadow-lg">
                    <Signature
                      paths={animatedPaths}
                      isFill={isFillMode}
                      viewBox={isFillMode ? `0 0 ${CANVAS_W} ${CANVAS_H}` : svgViewBox}
                      svgTransform={isFillMode ? '' : svgTransform}
                      className="text-slate-900 w-full"
                      clusterMeta={clusterMeta}
                      animStyle={animStyle}
                      animSpeed={animSpeed}
                      animKey={animKey}
                    />
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-3 mt-6">
                  <Button
                    variant="default"
                    onClick={() => setAnimKey(k => k + 1)}
                    className="px-5 py-2.5 rounded-xl text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> Replay
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowControls(c => !c)}
                    className="px-5 py-2.5 rounded-xl text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                    {showControls ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                  </Button>
                  <Button
                    variant="export"
                    onClick={() => setShowExport(true)}
                    className="px-5 py-2.5 rounded-xl text-sm"
                  >
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </div>

                {/* Collapsible controls */}
                <AnimatePresence>
                  {showControls && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="w-full max-w-lg overflow-hidden"
                    >
                      <div className="pt-5 space-y-4">
                        {/* Animation Style */}
                        <div className="bg-[#FFE9CE]/20 rounded-xl p-4 border border-[#FFBE86]/20">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 font-body">Animation Style</p>
                          <div className="flex gap-2">
                            {ANIMATION_STYLES.map(s => (
                              <motion.button
                                key={s.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { setAnimStyle(s.id); setAnimKey(k => k + 1); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                  animStyle === s.id
                                    ? 'bg-white shadow-sm text-slate-900 ring-1 ring-[#3777FF]/30'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-[#FFE9CE]/40'
                                }`}
                              >
                                <span>{s.icon}</span> {s.label}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Speed */}
                        <div className="bg-[#FFE9CE]/20 rounded-xl p-4 border border-[#FFBE86]/20">
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              <Gauge className="w-3.5 h-3.5" /> Speed
                            </label>
                            <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{animSpeed}×</span>
                          </div>
                          <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.25"
                            value={animSpeed}
                            onChange={(e) => { setAnimSpeed(Number(e.target.value)); setAnimKey(k => k + 1); }}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>Slow</span>
                            <span>Fast</span>
                          </div>
                        </div>

                        {/* Sensitivity — upload only */}
                        {uploadedImageRef.current && !isFillMode && (
                          <div className="bg-[#FFE9CE]/20 rounded-xl p-4 border border-[#FFBE86]/20">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Sensitivity
                              </label>
                              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">{sensitivity}</span>
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
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                              <span>Less ink</span>
                              <span>More ink</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Try Another */}
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="mt-6 px-5 py-2.5 rounded-xl text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Try Another
                </Button>
              </motion.div>

            ) : (
              /* ── INPUT VIEWS ── */
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-2xl mx-auto"
              >
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' ? (
                    <motion.form
                      key="upload-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25 }}
                      onDragEnter={() => setDragActive(true)}
                      onDragLeave={() => setDragActive(false)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragActive(false);
                        if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0]);
                      }}
                      className={`relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl transition-all duration-300 ease-out ${
                        dragActive
                          ? 'border-[#3777FF] bg-[#3777FF]/5 scale-[1.01] shadow-lg shadow-[#3777FF]/10'
                          : 'border-[#FFBE86]/50 dropzone-paper hover:border-[#FFBE86]/80 hover:shadow-md'
                      } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && processUpload(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isProcessing}
                      />
                      {isProcessing ? (
                        <motion.div
                          className="flex flex-col items-center text-[#3777FF]"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Loader2 className="w-10 h-10 animate-spin mb-4" />
                          <p className="font-semibold font-display text-slate-800">Digitizing...</p>
                          <p className="text-sm text-[#FFBE86] mt-1">Tracing your signature curves</p>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-500 pointer-events-none">
                          <motion.div
                            className="bg-white p-5 rounded-2xl shadow-sm border border-[#FFE9CE] mb-5"
                            whileHover={{ scale: 1.08, rotate: 3 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            <Upload className="w-8 h-8 text-[#3777FF]" />
                          </motion.div>
                          <p className="font-semibold text-slate-700 text-lg font-display">Drop your signature here</p>
                          <p className="text-sm mt-1.5 text-slate-400">PNG, JPG, SVG or GIF</p>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="h-px w-12 bg-[#FFB5C2]/40" />
                            <span className="text-xs text-[#FFB5C2] uppercase tracking-widest">or browse</span>
                            <div className="h-px w-12 bg-[#FFB5C2]/40" />
                          </div>
                        </div>
                      )}
                    </motion.form>
                  ) : (
                    <motion.div
                      key="draw-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center w-full"
                    >
                      <div className="relative w-full rounded-2xl overflow-hidden border border-[#FFBE86]/30 bg-[#fffaf4] shadow-inner touch-none ruled-lines">
                        <canvas
                          ref={canvasRef}
                          width={CANVAS_W}
                          height={CANVAS_H}
                          className="w-full h-auto cursor-crosshair block"
                          onMouseDown={startStroke} onMouseMove={continueStroke} onMouseUp={endStroke} onMouseLeave={endStroke}
                          onTouchStart={startStroke} onTouchMove={continueStroke} onTouchEnd={endStroke}
                        />
                        <AnimatePresence>
                          {!hasDrawn && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                              <span className="text-slate-300/80 font-display italic text-xl tracking-wide">Sign here</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="w-full flex items-center justify-between mt-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              finishedRef.current.pop();
                              setFinishedStrokes([...finishedRef.current]);
                              fullRedraw(finishedRef.current);
                              if (!finishedRef.current.length) setHasDrawn(false);
                            }}
                            disabled={!finishedStrokes.length}
                            className="px-3 py-2 rounded-lg text-sm"
                          >
                            <Undo className="w-4 h-4" /> Undo
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              finishedRef.current = [];
                              setFinishedStrokes([]);
                              fullRedraw([]);
                              setHasDrawn(false);
                            }}
                            disabled={!finishedStrokes.length}
                            className="px-3 py-2 rounded-lg text-sm"
                          >
                            <Trash2 className="w-4 h-4" /> Clear
                          </Button>
                        </div>

                        <Button
                          variant="primary"
                          onClick={animateDrawing}
                          disabled={!finishedStrokes.length}
                          className="px-6 py-2.5 rounded-xl text-sm"
                        >
                          <Play className="w-4 h-4 fill-current" /> Animate
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-5 px-6 border-t border-[#FFBE86]/20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-slate-400">Signature Animator</p>
          <p className="text-xs text-slate-300">Built with care</p>
        </div>
      </footer>

      {/* ── Export Modal ── */}
      <AnimatePresence>
        {showExport && (
          <ExportModal
            snippet={exportSnippet}
            staticSVG={staticSVG}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
