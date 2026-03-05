import { errorResponse } from '../_lib/errors.js';
import { getJob, sanitizeJob } from '../_lib/jobStore.js';
import { sendJson } from '../_lib/http.js';

function pickJobId(req) {
  const raw = req.query?.jobId;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for this endpoint.' } });
    return;
  }

  try {
    const jobId = pickJobId(req);
    const job = getJob(jobId);

    if (!job) {
      sendJson(res, 404, { error: { code: 'JOB_NOT_FOUND', message: 'Export job was not found.' } });
      return;
    }

    sendJson(res, 200, { job: sanitizeJob(job) });
  } catch (error) {
    const { status, body } = errorResponse(error);
    sendJson(res, status, body);
  }
}
