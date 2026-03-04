import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.10';
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let ffmpegInstance = null;
let loadPromise = null;

async function createFfmpeg() {
  const ffmpeg = new FFmpeg();

  const [coreURL, wasmURL, workerURL] = await Promise.all([
    toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
    toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.worker.js`, 'text/javascript'),
  ]);

  await ffmpeg.load({ coreURL, wasmURL, workerURL });
  return ffmpeg;
}

export async function getFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  if (!loadPromise) {
    loadPromise = createFfmpeg()
      .then((ffmpeg) => {
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      })
      .finally(() => {
        loadPromise = null;
      });
  }

  return loadPromise;
}
