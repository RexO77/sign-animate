import process from 'node:process';
import { encodePayloadSchema } from '../export/_lib/contracts.js';
import { ApiError, errorResponse } from '../export/_lib/errors.js';
import { encodeWithLocalWorker } from '../export/_lib/localEncoder.js';
import { readJsonBody, sendJson } from '../export/_lib/http.js';

function validateToken(req) {
  const configured = process.env.EXPORT_INTERNAL_TOKEN;
  const provided = req.headers['x-internal-export-token'];

  if (!configured) {
    throw new ApiError(503, 'INTERNAL_TOKEN_MISSING', 'Internal worker token is not configured.');
  }

  if (!provided || provided !== configured) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid internal worker token.');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for this endpoint.' } });
    return;
  }

  try {
    validateToken(req);

    const parsed = encodePayloadSchema.safeParse(await readJsonBody(req));
    if (!parsed.success) {
      throw new ApiError(400, 'INVALID_PAYLOAD', 'Worker payload is invalid.', parsed.error.flatten());
    }

    const result = await encodeWithLocalWorker(parsed.data);

    sendJson(res, 200, {
      result: {
        route: result.route,
        filename: result.filename,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        metrics: result.metrics,
        fileBase64: result.fileBuffer.toString('base64'),
      },
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    sendJson(res, status, body);
  }
}
