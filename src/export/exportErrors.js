export const ExportErrorCode = {
  FFMPEG_LOAD_FAILED: 'FFMPEG_LOAD_FAILED',
  ENCODER_UNAVAILABLE: 'ENCODER_UNAVAILABLE',
  ENCODE_NONZERO_EXIT: 'ENCODE_NONZERO_EXIT',
  OUTPUT_MISSING: 'OUTPUT_MISSING',
  FRAME_ENCODE_FAILED: 'FRAME_ENCODE_FAILED',
  FALLBACK_FAILED: 'FALLBACK_FAILED',
  API_FAILED: 'API_FAILED',
};

export class ExportError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    this.details = details;
  }
}

export function asExportError(error, fallbackCode, fallbackMessage) {
  if (error instanceof ExportError) return error;

  const message = error instanceof Error ? error.message : (fallbackMessage || String(error));
  return new ExportError(fallbackCode, message, {
    cause: error instanceof Error ? error.stack : String(error),
  });
}
