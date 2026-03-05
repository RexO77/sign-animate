import { dispatchEncode } from './encodeDispatcher.js';
import { errorResponse } from './errors.js';
import { getJob, setJob } from './jobStore.js';

const activeJobs = globalThis.__signanimateActiveExportJobs || new Map();
globalThis.__signanimateActiveExportJobs = activeJobs;

function logCompletion(jobId, payload, result, durationMs) {
  console.info(JSON.stringify({
    scope: 'export-job',
    jobId,
    route: result.route,
    format: payload.format,
    durationMs,
    complexity: result.complexity,
  }));
}

function logFailure(jobId, failureCode, error) {
  console.error(JSON.stringify({
    scope: 'export-job',
    jobId,
    failureCode,
    error: error instanceof Error ? error.message : String(error),
  }));
}

export function ensureJobProcessing(jobId, payload) {
  if (!jobId || !payload) return;
  if (activeJobs.has(jobId)) return;

  const current = getJob(jobId);
  if (!current || current.status === 'completed' || current.status === 'failed') return;

  const startedAt = Date.now();

  const task = (async () => {
    setJob(jobId, {
      ...current,
      status: 'processing',
      progress: 0,
      route: 'pending',
      startedAt: new Date().toISOString(),
    });

    try {
      const result = await dispatchEncode(payload, {
        onProgress: (progress) => {
          const live = getJob(jobId);
          if (!live || live.status !== 'processing') return;

          setJob(jobId, {
            ...live,
            progress,
          });
        },
      });

      const live = getJob(jobId);
      if (!live) return;

      setJob(jobId, {
        ...live,
        status: 'completed',
        progress: 1,
        route: result.route,
        filename: result.filename,
        mimeType: result.mimeType,
        fileBuffer: result.fileBuffer,
        fileSize: result.fileBuffer?.length || 0,
        durationMs: Date.now() - startedAt,
        metrics: result.metrics,
        complexity: result.complexity,
        completedAt: new Date().toISOString(),
      });

      logCompletion(jobId, payload, result, Date.now() - startedAt);
    } catch (error) {
      const { body } = errorResponse(error);
      const failureCode = body?.error?.code || 'EXPORT_FAILED';

      const live = getJob(jobId);
      if (live) {
        setJob(jobId, {
          ...live,
          status: 'failed',
          progress: live.progress ?? 0,
          failureCode,
          errorMessage: body?.error?.message || 'Export job failed.',
          completedAt: new Date().toISOString(),
        });
      }

      logFailure(jobId, failureCode, error);
    } finally {
      activeJobs.delete(jobId);
    }
  })();

  activeJobs.set(jobId, task);
}
