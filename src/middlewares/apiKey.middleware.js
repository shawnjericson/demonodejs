import { timingSafeEqual } from 'node:crypto';

import { config } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

/** So sánh chuỗi theo thời gian hằng số để không rò rỉ thông tin qua timing attack */
const safeCompare = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  // timingSafeEqual yêu cầu hai buffer cùng độ dài
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

/**
 * ============================================================================
 * YÊU CẦU 3.2 — API KEY GUARD (chỉ áp dụng cho POST / PUT / DELETE)
 * ============================================================================
 * - Đọc header `x-api-key` của request.
 * - Đúng khoá  -> next(), cho phép Thêm / Sửa / Xoá.
 * - Sai/thiếu  -> HTTP 401 kèm thông báo "Lỗi: Sai hoặc thiếu API Key!".
 *
 * Middleware được gắn ở tầng router cho đúng 3 method ghi dữ liệu,
 * nên GET vẫn công khai với mọi người.
 */
export const apiKeyGuard = (req, res, next) => {
  const provided = req.headers['x-api-key'];

  if (!provided) {
    return next(
      new ApiError(401, 'Lỗi: Sai hoặc thiếu API Key!', {
        code: 'API_KEY_MISSING',
        details: {
          hint: 'Thêm header "x-api-key" vào request.',
          example: 'x-api-key: super-secret-key',
        },
      }),
    );
  }

  if (!safeCompare(provided, config.apiKey)) {
    return next(
      new ApiError(401, 'Lỗi: Sai hoặc thiếu API Key!', {
        code: 'API_KEY_INVALID',
        details: { hint: 'Giá trị x-api-key không khớp với khoá của server.' },
      }),
    );
  }

  // Đánh dấu request đã xác thực, tầng sau có thể dùng lại thông tin này
  req.auth = { method: 'api-key', authenticated: true };
  next();
};
