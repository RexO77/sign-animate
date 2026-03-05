export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error;

  const message = error instanceof Error ? error.message : String(error);
  return new ApiError(500, 'INTERNAL_ERROR', message);
}

export function errorResponse(error) {
  const apiError = toApiError(error);
  return {
    status: apiError.status,
    body: {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
    },
  };
}
