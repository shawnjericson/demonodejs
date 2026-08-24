import { ApiError } from '../utils/ApiError.js';
import { fail } from '../utils/ApiResponse.js';
import { isDev } from '../config/index.js';
import { paint } from '../utils/logger.js';

/**
 * Middleware xử lý lỗi tập trung — luôn đăng ký CUỐI CÙNG trong pipeline.
 * Nhận diện được qua chữ ký 4 tham số (err, req, res, next).
 *
 * Nhờ có nó, mọi tầng bên trong chỉ cần `throw` và không nơi nào phải tự
 * res.status(...).json(...) khi gặp lỗi.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Body gửi lên không phải JSON hợp lệ -> express.json() ném lỗi này
  if (err?.type === 'entity.parse.failed') {
    err = ApiError.badRequest('JSON gửi lên bị sai cú pháp, không thể phân tích.', {
      hint: 'Kiểm tra dấu phẩy thừa hoặc thiếu ngoặc trong body.',
    });
  }

  const isKnown = err instanceof ApiError;
  const statusCode = isKnown ? err.statusCode : err.statusCode || err.status || 500;
  const message = isKnown || statusCode < 500
    ? err.message
    : 'Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.';

  // Lỗi 5xx là lỗi ngoài dự kiến -> in stack trace để lập trình viên truy vết
  if (statusCode >= 500) {
    console.error(
      paint.red(`\n✖ [${req.id}] Unhandled error tại ${req.method} ${req.originalUrl}`),
    );
    console.error(err);
  }

  return fail(res, {
    status: statusCode,
    code: isKnown ? err.code : ApiError.codeFromStatus(statusCode),
    message,
    details: isKnown
      ? err.details
      : isDev
        ? { name: err.name, stack: err.stack?.split('\n').slice(0, 5) }
        : undefined,
  });
};
