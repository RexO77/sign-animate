import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { ExportError, ExportErrorCode } from './exportErrors';

const CORE_VERSION = '0.12.10';

const diagnostics = {
  loadedFrom: null,
  attempts: [],
};

let ffmpegInstance = null;
let loadPromise = null;

async function runSelfTest(ffmpeg) {
  const ret = await ffmpeg.exec(['-version']);
  if (ret !== 0) {
    throw new Error(`ffmpeg self-test exited with code ${ret}`);
  }
}

async function buildCdnConfig(provider) {
  const base = provider === 'jsdelivr'
    ? `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`
    : `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

  const [coreURL, wasmURL, workerURL] = await Promise.all([
    toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript'),
  ]);

  return { coreURL, wasmURL, workerURL };
}

async function tryLoad(ffmpeg, attemptLabel, configFactory) {
  const attempt = {
    attempt: attemptLabel,
    ok: false,
    error: null,
  };

  try {
    const config = configFactory ? await configFactory() : undefined;
    await ffmpeg.load(config);
    await runSelfTest(ffmpeg);
    attempt.ok = true;
    diagnostics.attempts.push(attempt);
    diagnostics.loadedFrom = attemptLabel;
    return true;
  } catch (error) {
    attempt.error = error instanceof Error ? error.message : String(error);
    diagnostics.attempts.push(attempt);

    if (ffmpeg.loaded) {
      ffmpeg.terminate();
    }

    return false;
  }
}

async function createFfmpeg() {
  diagnostics.attempts = [];
  diagnostics.loadedFrom = null;

  const ffmpeg = new FFmpeg();

  const attempts = [
    { label: 'default-core', configFactory: null },
    { label: 'unpkg-umd', configFactory: () => buildCdnConfig('unpkg') },
    { label: 'jsdelivr-umd', configFactory: () => buildCdnConfig('jsdelivr') },
  ];

  for (const attempt of attempts) {
    const ok = await tryLoad(ffmpeg, attempt.label, attempt.configFactory);
    if (ok) {
      return ffmpeg;
    }
  }

  throw new ExportError(
    ExportErrorCode.FFMPEG_LOAD_FAILED,
    'Unable to load ffmpeg core in this browser/runtime.',
    { attempts: diagnostics.attempts },
  );
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

export function getFfmpegDiagnostics() {
  return {
    loadedFrom: diagnostics.loadedFrom,
    attempts: diagnostics.attempts,
  };
}
