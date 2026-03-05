import { createJobBodySchema } from '../_lib/contracts.js';
import { ApiError, errorResponse } from '../_lib/errors.js';
import { ensureJobProcessing } from '../_lib/jobRunner.js';
import { enforceRateLimit } from '../_lib/rateLimit.js';
import {
  generateJobId,
  getIdempotentJobId,
  getJob,
  sanitizeJob,
  setIdempotency,
  setJob,
} from '../_lib/jobStore.js';
import { getClientIp, readJsonBody, sendJson } from '../_lib/http.js';

function parsePayload(input) {
  const parsed = createJobBodySchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Export payload is invalid.', parsed.error.flatten());
  }
  return parsed.data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for this endpoint.' } });
    return;
  }

  try {
    const ip = getClientIp(req);
    const rate = enforceRateLimit(ip);
    res.setHeader('x-ratelimit-remaining', String(rate.remaining));
    res.setHeader('x-ratelimit-reset', String(rate.resetAt));

    const payload = parsePayload(await readJsonBody(req));

    const existingJobId = getIdempotentJobId(payload.idempotencyKey);
    if (existingJobId) {
      const existingJob = getJob(existingJobId);
      if (existingJob) {
        if (existingJob.status === 'queued' || existingJob.status === 'processing') {
          ensureJobProcessing(existingJobId, existingJob.payload || payload);
        }
        sendJson(res, 200, { job: sanitizeJob(existingJob) });
        return;
      }
    }

    const jobId = generateJobId();
    const createdAt = new Date().toISOString();

    setJob(jobId, {
      jobId,
      status: 'queued',
      progress: 0,
      format: payload.format,
      route: 'pending',
      createdAt,
      payload,
      logs: [],
    });
    setIdempotency(payload.idempotencyKey, jobId);

    ensureJobProcessing(jobId, payload);
    sendJson(res, 202, { job: sanitizeJob(getJob(jobId)) });
  } catch (error) {
    const { status, body } = errorResponse(error);
    sendJson(res, status, body);
  }
}
