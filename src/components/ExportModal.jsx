import React, { useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, Code, FileImage, Download, Film, Loader2 } from 'lucide-react';
import { useHaptics } from '../useHaptics';
import { buildAnimationModel } from '../export/animationModel';
import { downloadBlob, downloadFile, downloadPNG } from '../export/staticExport';

function normalizeError(error) {
  if (error instanceof Error && error.message) return error.message;
  return 'Export failed. Please try again.';
}

const EMPTY_EXPORT_STATE = {
  isExporting: false,
  format: null,
  stage: 'idle',
  progress: 0,
  error: '',
  failedFormat: null,
};

export default function ExportModal({
  buttonComponent,
  snippet,
  staticSVG,
  animationPayload,
  onClose,
}) {
  const Button = buttonComponent;
  const [copied, setCopied] = useState(false);
  const [activeExportTab, setActiveExportTab] = useState('code');
  const [exportState, setExportState] = useState(EMPTY_EXPORT_STATE);
  const textareaRef = useRef(null);
  const { haptic } = useHaptics();

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

  const safeClose = () => {
    if (exportState.isExporting) return;
    onClose();
  };

  const setStaticExportError = (error, failedFormat = null) => {
    setExportState((prev) => ({
      ...prev,
      error: normalizeError(error),
      failedFormat,
      isExporting: false,
      stage: 'idle',
      format: null,
      progress: 0,
    }));
  };

  const handleDownloadSVG = () => {
    if (exportState.isExporting) return;

    try {
      downloadFile(staticSVG, 'signature.svg', 'image/svg+xml');
      setExportState((prev) => ({ ...prev, error: '', failedFormat: null }));
    } catch (error) {
      setStaticExportError(error);
    }
  };

  const handleDownloadPNG = async () => {
    if (exportState.isExporting) return;

    try {
      await downloadPNG(staticSVG, 3, 'signature.png');
      setExportState((prev) => ({ ...prev, error: '', failedFormat: null }));
    } catch (error) {
      setStaticExportError(error);
    }
  };

  const handleAnimatedExport = async (format) => {
    if (exportState.isExporting) return;

    setExportState({
      isExporting: true,
      format,
      stage: 'render',
      progress: 0,
      error: '',
      failedFormat: null,
    });

    try {
      const model = buildAnimationModel(animationPayload);
      const { exportAnimatedSignature } = await import('../export/animatedExport');

      const blob = await exportAnimatedSignature({
        format,
        model,
        onStageChange: (stage) => {
          setExportState((prev) => ({ ...prev, stage }));
        },
        onProgress: (progress) => {
          setExportState((prev) => ({ ...prev, progress }));
        },
      });

      downloadBlob(blob, `signature.${format}`);
      setExportState(EMPTY_EXPORT_STATE);
    } catch (error) {
      setStaticExportError(error, format);
    }
  };

  const exportStatusMessage = (() => {
    if (exportState.isExporting) {
      if (exportState.stage === 'render') {
        const percent = Math.round(exportState.progress * 100);
        return `Rendering frames... ${percent}%`;
      }
      return `Encoding ${(exportState.format || '').toUpperCase()}...`;
    }

    if (exportState.error) {
      return exportState.error;
    }

    return 'PNG exports at 3× resolution for crisp display on retina screens';
  })();

  const isBusy = exportState.isExporting;

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/12 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) safeClose();
      }}
    >
      <Motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-primary/18 bg-surface"
      >
        <div className="flex items-start justify-between border-b border-primary/10 px-6 pb-4 pt-6 md:px-8">
          <div>
            <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-primary/45">Export</p>
            <h3 className="mt-1 font-serif text-[1.95rem] leading-none text-primary">Signature Output</h3>
            <p className="mt-1.5 text-sm text-primary/60">Download as image, video, GIF, or grab the embeddable code.</p>
          </div>
          <Button
            variant="ghost"
            onClick={safeClose}
            className="h-11 w-11 rounded-md p-0"
            disabled={isBusy}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 pt-4 md:px-8">
          <div className="inline-flex rounded-md border border-primary/15 bg-bg p-1">
            {[
              { id: 'code', label: 'Code Snippet', Icon: Code },
              { id: 'image', label: 'Image & Video', Icon: FileImage },
            ].map((tab) => (
              <Motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  haptic('tab');
                  setActiveExportTab(tab.id);
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${activeExportTab === tab.id
                  ? 'border border-primary/20 bg-surface text-primary'
                  : 'text-primary/55 hover:text-primary'
                  }`}
              >
                <tab.Icon className="h-4 w-4" /> {tab.label}
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
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="px-6 pb-2 pt-4 md:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary/55">Preview</p>
                <div className="flex items-center justify-center rounded-[1.2rem] border border-primary/12 bg-bg/75 p-7">
                  <div
                    className="w-full max-w-sm text-primary"
                    dangerouslySetInnerHTML={{ __html: snippet }}
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 pt-3 md:px-8">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/55">Embeddable Code</p>
                  <Button
                    variant={copied ? 'default' : 'outline'}
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs"
                  >
                    {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </Button>
                </div>
                <div className="flex min-h-0 flex-1 overflow-auto rounded-md border border-primary/15 bg-bg p-4">
                  <pre className="code-block whitespace-pre-wrap break-all text-primary">{snippet}</pre>
                  <textarea
                    ref={textareaRef}
                    value={snippet}
                    readOnly
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-primary/10 px-6 py-3 md:px-8">
                <p className="text-xs text-primary/55">No external dependencies required</p>
                <Button variant="primary" onClick={handleCopy} className="px-5 py-2.5 text-sm">
                  {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy to Clipboard</>}
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
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 px-6 pb-4 pt-4 md:px-8">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary/55">Preview</p>
                <div className="flex min-h-[220px] items-center justify-center rounded-[1.2rem] border border-primary/12 bg-bg/75 p-8">
                  <div
                    className="w-full max-w-md text-primary"
                    dangerouslySetInnerHTML={{ __html: staticSVG }}
                  />
                </div>
                <p className={`mt-3 text-center text-xs ${exportState.error ? 'text-red-600' : 'text-primary/55'}`}>
                  {exportStatusMessage}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 px-6 py-4 md:px-8">
                <div>
                  {exportState.error && exportState.failedFormat && (
                    <Button
                      variant="ghost"
                      onClick={() => handleAnimatedExport(exportState.failedFormat)}
                      disabled={isBusy}
                      className="px-4 py-2.5 text-sm"
                    >
                      Retry {exportState.failedFormat.toUpperCase()}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button variant="outline" onClick={handleDownloadSVG} className="px-5 py-2.5 text-sm" disabled={isBusy}>
                    <Download className="h-4 w-4" /> Download SVG
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPNG} className="px-5 py-2.5 text-sm" disabled={isBusy}>
                    <FileImage className="h-4 w-4" /> Download PNG
                  </Button>
                  <Button variant="outline" onClick={() => handleAnimatedExport('gif')} className="px-5 py-2.5 text-sm" disabled={isBusy}>
                    {isBusy && exportState.format === 'gif'
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting GIF</>
                      : <><Film className="h-4 w-4" /> Export GIF</>}
                  </Button>
                  <Button variant="primary" onClick={() => handleAnimatedExport('mp4')} className="px-5 py-2.5 text-sm" disabled={isBusy}>
                    {isBusy && exportState.format === 'mp4'
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting MP4</>
                      : <><Film className="h-4 w-4" /> Export MP4</>}
                  </Button>
                </div>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.div>
    </Motion.div>
  );
}
