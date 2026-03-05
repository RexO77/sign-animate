import { Buffer } from 'node:buffer';
import process from 'node:process';
import { ApiError } from './errors.js';

function trimSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export async function encodeWithRemoteWorker(payload) {
  const workerUrl = process.env.EXPORT_WORKER_URL;
  const workerToken = process.env.EXPORT_INTERNAL_TOKEN || '';

  if (!workerUrl) {
    throw new ApiError(503, 'WORKER_URL_MISSING', 'Cloud worker URL is not configured.');
  }

  const response = await fetch(`${trimSlash(workerUrl)}/internal/encode`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-export-token': workerToken,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.error?.message || `Cloud worker failed with status ${response.status}`;
    throw new ApiError(502, 'WORKER_REQUEST_FAILED', message, body?.error || null);
  }

  const base64 = body?.result?.fileBase64;
  if (!base64 || typeof base64 !== 'string') {
    throw new ApiError(502, 'WORKER_INVALID_RESPONSE', 'Cloud worker response did not include fileBase64.');
  }

  return {
    route: 'cloud-worker',
    filename: body.result.filename,
    mimeType: body.result.mimeType,
    fileBuffer: Buffer.from(base64, 'base64'),
    durationMs: body.result.durationMs,
    metrics: body.result.metrics || null,
  };
}
