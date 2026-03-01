import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, RefreshCw, Pencil, Image as ImageIcon, Undo, Trash2, Play, SlidersHorizontal, Gauge, RotateCcw, Settings, Download, X, Check, Copy, ChevronDown, ChevronUp, PenTool, Code, FileImage } from 'lucide-react';
import { orderPaths, computeTiming, getPathBBox } from './pathOrder';

// ─── MATH & DRAWING HELPERS ───────────────────────────────────────────────────
const CANVAS_W = 600;
const CANVAS_H = 200;
const INK_COLOR = '#161311';
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
  { id: 'letter', label: 'Letter by Letter' },
  { id: 'flow', label: 'Continuous' },
  { id: 'classic', label: 'Classic' },
];

// ─── BUTTON COMPONENT ─────────────────────────────────────────────────────────
const Button = ({ children, variant = 'default', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 disabled:opacity-45 disabled:pointer-events-none';
  const variants = {
    default: 'bg-accent text-bg hover:brightness-105',
    ghost: 'text-primary/85 hover:bg-bg/78 hover:text-dark',
    outline: 'border-primary/30 bg-bg text-primary hover:bg-bg/72',
    danger: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
    primary: 'bg-accent text-bg hover:brightness-105',
    export: 'bg-dark text-bg hover:bg-dark/90',
  };
  return (
    <Motion.button
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Motion.button>
  );
};

// ─── EXPORT SNIPPET GENERATOR ─────────────────────────────────────────────────
function generateExportSnippet({ paths, isFill, viewBox, svgTransform, animStyle, animSpeed, clusterMeta }) {
  const speed = animSpeed || 1;
  const s = 1 / speed;
  const vb = isFill ? `0 0 ${CANVAS_W} ${CANVAS_H}` : (viewBox || '0 0 646 226');
  const fillColor = '#161311';

  if (animStyle === 'flow' || (animStyle === 'flow' && !isFill)) {
    const maxCluster = clusterMeta?.length
      ? Math.max(...clusterMeta.map(m => m.clusterIndex))
      : 0;
    const totalDuration = ((maxCluster + 1) * 0.5 * s + 0.5 * s).toFixed(2);

    const pathsMarkup = paths.map((d) =>
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
  const fillColor = '#161311';

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
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-primary/30 bg-bg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary/20 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-dark font-display">Export Signature</h3>
            <p className="text-sm text-muted mt-0.5">Download as image or grab the embeddable code</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-0">
          <div className="inline-flex rounded-md border border-primary/20 bg-bg/72 p-1">
            {[
              { id: 'code', label: 'Code Snippet', Icon: Code },
              { id: 'image', label: 'Image', Icon: FileImage },
            ].map(tab => (
              <Motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveExportTab(tab.id)}
                className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors ${
                  activeExportTab === tab.id
                    ? 'border border-primary/30 bg-bg text-dark'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <tab.Icon className="w-4 h-4" /> {tab.label}
              </Motion.button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeExportTab === 'code' ? (
            <Motion.div
              key="code-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Preview */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs font-semibold text-muted/75 uppercase tracking-wider mb-2">Preview</p>
                <div className="flex items-center justify-center rounded-md border border-primary/20 bg-bg/72 p-6">
                  <div
                    className="w-full max-w-sm"
                    dangerouslySetInnerHTML={{ __html: snippet }}
                  />
                </div>
              </div>

              {/* Code */}
              <div className="px-6 pt-3 pb-4 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted/75 uppercase tracking-wider">Embeddable Code</p>
                  <Button
                    variant={copied ? 'export' : 'outline'}
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                </div>
                <div className="flex-1 overflow-auto rounded-md bg-dark p-4 min-h-0">
                  <pre className="code-block text-bg/85 whitespace-pre-wrap break-all">{snippet}</pre>
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
              <div className="flex items-center justify-between border-t border-primary/20 px-6 py-3">
                <p className="text-xs text-muted/75">No external dependencies required</p>
                <Button variant="primary" onClick={handleCopy} className="px-5 py-2.5 text-sm">
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
                </Button>
              </div>
            </Motion.div>
          ) : (
            <Motion.div
              key="image-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Image preview */}
              <div className="px-6 pt-4 pb-4 flex-1">
                <p className="text-xs font-semibold text-muted/75 uppercase tracking-wider mb-2">Preview</p>
                <div className="flex min-h-[200px] items-center justify-center rounded-md border border-primary/20 bg-bg/72 p-8">
                  <div
                    className="w-full max-w-md"
                    dangerouslySetInnerHTML={{ __html: staticSVG }}
                  />
                </div>
                <p className="text-xs text-muted/75 mt-3 text-center">
                  PNG exports at 3× resolution for crisp display on retina screens
                </p>
              </div>

              {/* Download buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-primary/20 px-6 py-4">
                <Button variant="outline" onClick={handleDownloadSVG} className="px-5 py-2.5 text-sm">
                  <Download className="w-4 h-4" /> Download SVG
                </Button>
                <Button variant="primary" onClick={handleDownloadPNG} className="px-5 py-2.5 text-sm">
                  <FileImage className="w-4 h-4" /> Download PNG
                </Button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </Motion.div>
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
        <Motion.svg
          key={animKey}
          viewBox={viewBox || "0 0 646 226"}
          xmlns="http://www.w3.org/2000/svg"
          className={`h-auto w-full overflow-hidden ${className || ''}`}
          {...props}
        >
          <defs>
            <clipPath id={`reveal-${animKey}`}>
              <Motion.rect
                x="0" y="0"
                height="100%"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: totalDuration, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#reveal-${animKey})`}>
            <g transform={svgTransform || undefined} fill="#161311" stroke="none">
              {paths.map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" />
              ))}
            </g>
          </g>
        </Motion.svg>
      );
    }

    return (
      <Motion.svg
        key={animKey}
        viewBox={viewBox || "0 0 646 226"}
        xmlns="http://www.w3.org/2000/svg"
        className={`h-auto w-full overflow-hidden ${className || ''}`}
        {...props}
      >
        <g transform={svgTransform || undefined} fill="#161311" stroke="none">
          {paths.map((d, i) => {
            const meta = clusterMeta?.[i] || null;
            const { delay, duration } = computeTiming(i, meta, style, speed);
            return (
              <Motion.path
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
      </Motion.svg>
    );
  }

  return (
    <Motion.svg
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
          <Motion.path
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
    </Motion.svg>
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
    <div className="min-h-screen page-bg flex flex-col font-body text-dark">
      {/* ── Header ── */}
      <header className="w-full border-b border-primary/20 bg-bg/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
              <PenTool className="w-5 h-5 text-bg" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-dark">Signature Animator</h1>
              <p className="text-xs tracking-wide text-muted">Turn any signature into a living animation</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 px-6 py-10">
        <Motion.div
          layout
          className="mx-auto w-full max-w-5xl"
        >
          {/* Title area — only when no results */}
          <AnimatePresence mode="wait">
            {!hasResults && (
              <Motion.div
                key="input-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 text-center"
              >
                <h2 className="mb-2 text-2xl font-display font-semibold text-dark/90">
                  {activeTab === 'upload' ? 'Upload Your Signature' : 'Draw Your Signature'}
                </h2>
                <p className="text-sm text-muted">
                  {activeTab === 'upload' ? 'Drop an image to digitize and animate' : 'Sign with your mouse or finger, then animate'}
                </p>

                {/* Tabs */}
                <div className="mx-auto mt-6 inline-flex rounded-md border border-primary/20 bg-bg p-1">
                  {[
                    { id: 'upload', label: 'Upload', Icon: ImageIcon },
                    { id: 'draw', label: 'Draw', Icon: Pencil },
                  ].map(tab => (
                    <Motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 rounded px-6 py-2.5 text-sm font-semibold transition-colors ${
                        activeTab === tab.id
                          ? 'border border-primary/30 bg-bg/72 text-dark'
                          : 'text-muted hover:text-primary'
                      }`}
                    >
                      <tab.Icon className="w-4 h-4" /> {tab.label}
                    </Motion.button>
                  ))}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* ── RESULTS VIEW ── */}
          <AnimatePresence mode="wait">
            {hasResults ? (
              <Motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="flex flex-col items-center"
              >
                {/* Signature preview */}
                <div className="mx-auto flex min-h-[260px] w-full max-w-3xl items-center justify-center border border-primary/20 bg-bg p-8">
                  <Signature
                    paths={animatedPaths}
                    isFill={isFillMode}
                    viewBox={isFillMode ? `0 0 ${CANVAS_W} ${CANVAS_H}` : svgViewBox}
                    svgTransform={isFillMode ? '' : svgTransform}
                    className="w-full text-dark"
                    clusterMeta={clusterMeta}
                    animStyle={animStyle}
                    animSpeed={animSpeed}
                    animKey={animKey}
                  />
                </div>

                {/* Action bar */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="default"
                    onClick={() => setAnimKey(k => k + 1)}
                    className="px-5 py-2.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Replay
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowControls(c => !c)}
                    className="px-5 py-2.5"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                    {showControls ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                  </Button>
                  <Button
                    variant="export"
                    onClick={() => setShowExport(true)}
                    className="px-5 py-2.5"
                  >
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </div>

                {/* Collapsible controls */}
                <AnimatePresence>
                  {showControls && (
                    <Motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="w-full max-w-3xl overflow-hidden"
                    >
                      <div className="mt-5 divide-y divide-primary/20 border border-primary/20 bg-bg">
                        {/* Animation Style */}
                        <div className="p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted font-body">Animation Style</p>
                          <div className="flex gap-2">
                            {ANIMATION_STYLES.map(s => (
                              <Motion.button
                                key={s.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setAnimStyle(s.id); setAnimKey(k => k + 1); }}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors ${
                                  animStyle === s.id
                                    ? 'border-accent/45 bg-accent/12 text-dark'
                                    : 'border-primary/20 text-muted hover:text-primary'
                                }`}
                              >
                                {s.label}
                              </Motion.button>
                            ))}
                          </div>
                        </div>

                        {/* Speed */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                              <Gauge className="w-3.5 h-3.5" /> Speed
                            </label>
                            <span className="text-xs font-mono text-primary/85 bg-bg/72 px-2 py-0.5 rounded border border-primary/20">{animSpeed}×</span>
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
                          <div className="mt-1 flex justify-between text-xs text-muted">
                            <span>Slow</span>
                            <span>Fast</span>
                          </div>
                        </div>

                        {/* Sensitivity — upload only */}
                        {uploadedImageRef.current && !isFillMode && (
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                                <SlidersHorizontal className="w-3.5 h-3.5" /> Sensitivity
                              </label>
                              <span className="text-xs font-mono text-primary/85 bg-bg/72 px-2 py-0.5 rounded border border-primary/20">{sensitivity}</span>
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
                            <div className="mt-1 flex justify-between text-xs text-muted">
                              <span>Less ink</span>
                              <span>More ink</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>

                {/* Try Another */}
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="mt-6 px-5 py-2.5"
                >
                  <RefreshCw className="w-4 h-4" /> Try Another
                </Button>
              </Motion.div>

            ) : (
              /* ── INPUT VIEWS ── */
              <Motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-2xl mx-auto"
              >
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' ? (
                    <Motion.form
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
                      className={`relative flex min-h-[300px] w-full flex-col items-center justify-center border-2 border-dashed rounded-md transition-colors duration-200 ${
                        dragActive
                          ? 'border-accent bg-accent/10'
                          : 'border-primary/30 bg-bg hover:border-primary/45'
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
                        <Motion.div
                          className="flex flex-col items-center text-accent"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Loader2 className="w-10 h-10 animate-spin mb-4" />
                          <p className="font-semibold font-display text-dark/90">Digitizing...</p>
                          <p className="mt-1 text-sm text-muted">Tracing your signature curves</p>
                        </Motion.div>
                      ) : (
                        <div className="pointer-events-none flex flex-col items-center text-muted">
                          <Motion.div
                            className="mb-5 border border-primary/30 bg-bg/72 p-4"
                            whileHover={{ y: -2 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                          >
                            <Upload className="w-8 h-8 text-accent" />
                          </Motion.div>
                          <p className="text-lg font-semibold font-display text-primary">Drop your signature here</p>
                          <p className="mt-1.5 text-sm text-muted">PNG, JPG, SVG or GIF</p>
                          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted/75">or browse files</p>
                        </div>
                      )}
                    </Motion.form>
                  ) : (
                    <Motion.div
                      key="draw-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center w-full"
                    >
                      <div className="relative w-full overflow-hidden rounded-md border border-primary/30 bg-bg touch-none ruled-lines">
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
                            <Motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                              <span className="text-primary/35 font-display italic text-xl tracking-wide">Sign here</span>
                            </Motion.div>
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
                            className="px-3 py-2"
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
                            className="px-3 py-2"
                          >
                            <Trash2 className="w-4 h-4" /> Clear
                          </Button>
                        </div>

                        <Button
                          variant="primary"
                          onClick={animateDrawing}
                          disabled={!finishedStrokes.length}
                          className="px-6 py-2.5"
                        >
                          <Play className="w-4 h-4 fill-current" /> Animate
                        </Button>
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-primary/20 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-xs text-muted">Signature Animator</p>
          <p className="text-xs text-muted/75">Built with care</p>
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
