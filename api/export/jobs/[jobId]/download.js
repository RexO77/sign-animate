import { errorResponse } from '../../_lib/errors.js';
import { getJob } from '../../_lib/jobStore.js';
import { sendJson } from '../../_lib/http.js';

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

    if (job.status !== 'completed' || !job.fileBuffer) {
      sendJson(res, 409, { error: { code: 'JOB_NOT_READY', message: 'Export job is not ready for download.' } });
      return;
    }

    res.status(200);
    res.setHeader('content-type', job.mimeType || 'application/octet-stream');
    res.setHeader('content-length', String(job.fileBuffer.length));
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-disposition', `attachment; filename="${job.filename || `signature.${job.format}`}"`);
    res.send(job.fileBuffer);
  } catch (error) {
    const { status, body } = errorResponse(error);
    sendJson(res, status, body);
  }
}
