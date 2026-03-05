import { Buffer } from 'node:buffer';
import { ApiError } from './errors.js';

const MAX_JSON_BODY_BYTES = 1_500_000;

export function getClientIp(req) {
  const header = req.headers['x-forwarded-for'];
  if (typeof header === 'string' && header.length > 0) {
    return header.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body);
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const normalized = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    totalBytes += normalized.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Export payload exceeds the allowed size.');
    }
    chunks.push(normalized);
  }

  if (!chunks.length) {
    throw new ApiError(400, 'INVALID_JSON', 'Request body is required.');
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Malformed JSON payload.');
  }
}

export function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}
