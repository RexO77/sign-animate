import { ExportError, ExportErrorCode } from './exportErrors';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asApiError(response, body) {
  const code = body?.error?.code || `API_${response.status}`;
  const message = body?.error?.message || `Export API request failed with status ${response.status}`;
  return new ExportError(ExportErrorCode.API_FAILED, message, {
    code,
    status: response.status,
    details: body?.error?.details || null,
  });
}

export async function createExportJob(payload) {
  const response = await fetch('/api/export/jobs', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonResponse(response);
  if (!response.ok) {
    throw asApiError(response, body);
  }

  return body;
}

export async function getExportJob(jobId) {
  const response = await fetch(`/api/export/jobs/${encodeURIComponent(jobId)}`);
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw asApiError(response, body);
  }

  return body?.job;
}

export async function downloadExportJob(jobId) {
  const response = await fetch(`/api/export/jobs/${encodeURIComponent(jobId)}/download`);
  if (!response.ok) {
    const body = await parseJsonResponse(response);
    throw asApiError(response, body);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);

  return {
    blob,
    filename: filenameMatch?.[1] || null,
    mimeType: response.headers.get('content-type') || blob.type,
  };
}

export async function pollExportJob(jobId, { onUpdate, timeoutMs = 300000 } = {}) {
  const start = Date.now();
  let delay = 900;

  while (Date.now() - start < timeoutMs) {
    const job = await getExportJob(jobId);
    onUpdate?.(job);

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new ExportError(
        ExportErrorCode.FALLBACK_FAILED,
        job.errorMessage || 'Cloud export job failed.',
        {
          failureCode: job.failureCode || null,
          job,
        },
      );
    }

    await sleep(delay);
    delay = Math.min(Math.round(delay * 1.3), 3500);
  }

  throw new ExportError(
    ExportErrorCode.FALLBACK_FAILED,
    'Timed out waiting for cloud export job to complete.',
    { jobId, timeoutMs },
  );
}
