import process from 'node:process';
import { estimateComplexity } from './contracts.js';
import { encodeWithLocalWorker } from './localEncoder.js';
import { encodeWithRemoteWorker } from './workerClient.js';

function shouldPreferCloud(payload, complexity) {
  if (!process.env.EXPORT_WORKER_URL) return false;

  if (payload.reason && String(payload.reason).toUpperCase().includes('FFMPEG')) {
    return true;
  }

  if (payload.reason && String(payload.reason).toUpperCase().includes('ENCODER')) {
    return true;
  }

  if (complexity.estimatedPixels > 180_000_000) return true;
  if (payload.format === 'mp4' && complexity.estimatedFrames > 220) return true;

  return false;
}

export async function dispatchEncode(payload, { onProgress } = {}) {
  const complexity = estimateComplexity(payload);
  const preferCloud = shouldPreferCloud(payload, complexity);

  if (preferCloud) {
    try {
      const cloudResult = await encodeWithRemoteWorker(payload);
      return { ...cloudResult, complexity, preferredRoute: 'cloud-worker' };
    } catch {
      const localResult = await encodeWithLocalWorker(payload, { onProgress });
      return { ...localResult, complexity, preferredRoute: 'cloud-worker' };
    }
  }

  try {
    const localResult = await encodeWithLocalWorker(payload, { onProgress });
    return { ...localResult, complexity, preferredRoute: 'local-worker' };
  } catch (localError) {
    if (!process.env.EXPORT_WORKER_URL) {
      throw localError;
    }

    const cloudResult = await encodeWithRemoteWorker(payload);
    return { ...cloudResult, complexity, preferredRoute: 'local-worker' };
  }
}
