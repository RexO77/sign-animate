const jobs = globalThis.__signanimateExportJobs || new Map();
globalThis.__signanimateExportJobs = jobs;

const idempotency = globalThis.__signanimateExportIdempotency || new Map();
globalThis.__signanimateExportIdempotency = idempotency;

const JOB_TTL_MS = 15 * 60 * 1000;
const MAX_JOBS = 200;

function isExpired(isoDate) {
  if (!isoDate) return false;
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return false;
  return (Date.now() - time) > JOB_TTL_MS;
}

function cleanupStore() {
  const now = Date.now();

  for (const [jobId, job] of jobs.entries()) {
    if (isExpired(job?.updatedAt || job?.createdAt)) {
      jobs.delete(jobId);
    }
  }

  for (const [key, value] of idempotency.entries()) {
    if (!value?.jobId || !jobs.has(value.jobId) || ((now - value.createdAt) > JOB_TTL_MS)) {
      idempotency.delete(key);
    }
  }

  if (jobs.size <= MAX_JOBS) return;

  const entries = [...jobs.entries()].sort(
    (left, right) => Date.parse(left[1]?.updatedAt || 0) - Date.parse(right[1]?.updatedAt || 0),
  );

  while (entries.length > MAX_JOBS) {
    const [jobId] = entries.shift();
    jobs.delete(jobId);
  }
}

export function generateJobId() {
  cleanupStore();
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getJob(jobId) {
  cleanupStore();
  return jobs.get(jobId) || null;
}

export function setJob(jobId, value) {
  cleanupStore();
  jobs.set(jobId, {
    ...value,
    updatedAt: new Date().toISOString(),
  });
}

export function setIdempotency(key, jobId) {
  cleanupStore();
  idempotency.set(key, {
    jobId,
    createdAt: Date.now(),
  });
}

export function getIdempotentJobId(key) {
  cleanupStore();
  const entry = idempotency.get(key);
  if (typeof entry === 'string') return entry;
  return entry?.jobId || null;
}

export function sanitizeJob(job) {
  if (!job) return null;
  return {
    jobId: job.jobId,
    status: job.status,
    format: job.format,
    route: job.route,
    failureCode: job.failureCode || null,
    errorMessage: job.errorMessage || null,
    progress: job.progress ?? 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    downloadUrl: job.status === 'completed' ? `/api/export/jobs/${job.jobId}/download` : null,
    filename: job.status === 'completed' ? job.filename : null,
    mimeType: job.status === 'completed' ? job.mimeType : null,
  };
}
