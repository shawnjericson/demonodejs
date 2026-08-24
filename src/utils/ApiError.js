/**
 * Lỗi nghiệp vụ có kèm HTTP status code.
 * Mọi chỗ trong app chỉ cần `throw new ApiError(...)`,
 * error handler ở cuối pipeline sẽ lo phần trả response.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode  Mã HTTP trả về cho client
   * @param {string} message     Thông báo thân thiện với người dùng
   * @param {object} [options]
   * @param {string} [options.code]     Mã lỗi nội bộ để client bắt case
   * @param {any}    [options.details]  Thông tin chi tiết (vd: danh sách field sai)
   */
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || ApiError.codeFromStatus(statusCode);
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', details });
  }

  static unauthorized(message) {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }

  static notFound(message) {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }

  static conflict(message, details) {
    return new ApiError(409, message, { code: 'CONFLICT', details });
  }

  static codeFromStatus(status) {
    return (
      {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        500: 'INTERNAL_SERVER_ERROR',
      }[status] || 'ERROR'
    );
  }
}
