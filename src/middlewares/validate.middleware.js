import { ApiError } from '../utils/ApiError.js';

/**
 * ============================================================================
 * YÊU CẦU 3.3 — DATA VALIDATOR (chỉ áp dụng cho POST và PUT)
 * ============================================================================
 * Quy tắc bắt buộc theo đề bài:
 *   - title : chuỗi, không được để trống
 *   - genre : chuỗi, không được để trống
 *   - price : phải là Number và lớn hơn 0
 *
 * Sai bất kỳ điều kiện nào -> HTTP 400 Bad Request, chặn không cho lưu.
 *
 * Điểm cộng: validator gom TẤT CẢ lỗi rồi trả về một lần, thay vì báo từng
 * lỗi một. Client sửa được toàn bộ form chỉ sau một lượt gọi API.
 * Đồng thời body được "làm sạch" (trim chuỗi, ép kiểu số) trước khi xuống
 * tầng service, nên service luôn nhận dữ liệu đã chuẩn hoá.
 */

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Chuỗi bắt buộc: phải là string và sau khi trim vẫn còn ký tự */
const requiredString = (field, label) => (body, errors) => {
  const value = body[field];

  if (typeof value !== 'string') {
    errors.push({
      field,
      message: `${label} phải là một chuỗi ký tự.`,
      received: value === undefined ? 'undefined' : typeof value,
    });
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    errors.push({ field, message: `${label} không được để trống.`, received: '""' });
    return;
  }

  body[field] = trimmed; // chuẩn hoá tại chỗ
};

/** Số bắt buộc: là Number thực sự (không NaN, không Infinity) và > 0 */
const requiredPositiveNumber = (field, label) => (body, errors) => {
  const value = body[field];

  // Chuỗi số từ form/query được ép kiểu, nhưng "abc" hay "" thì vẫn bị loại
  const numeric =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    errors.push({
      field,
      message: `${label} phải là một số (Number).`,
      received: value === undefined ? 'undefined' : `${typeof value} (${value})`,
    });
    return;
  }

  if (numeric <= 0) {
    errors.push({ field, message: `${label} phải lớn hơn 0.`, received: numeric });
    return;
  }

  body[field] = numeric;
};

/** Số tuỳ chọn: chỉ kiểm tra khi client có gửi lên */
const optionalNumber = (field, label, { min, max } = {}) => (body, errors) => {
  const value = body[field];
  if (value === undefined || value === null || value === '') return;

  const numeric = typeof value === 'string' ? Number(value) : value;

  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    errors.push({ field, message: `${label} phải là một số.`, received: `${value}` });
    return;
  }
  if (min !== undefined && numeric < min) {
    errors.push({ field, message: `${label} không được nhỏ hơn ${min}.`, received: numeric });
    return;
  }
  if (max !== undefined && numeric > max) {
    errors.push({ field, message: `${label} không được lớn hơn ${max}.`, received: numeric });
    return;
  }

  body[field] = numeric;
};

/** Chuỗi tuỳ chọn: chỉ kiểm tra khi client có gửi lên */
const optionalString = (field, label) => (body, errors) => {
  const value = body[field];
  if (value === undefined || value === null) return;

  if (typeof value !== 'string') {
    errors.push({ field, message: `${label} phải là một chuỗi ký tự.`, received: typeof value });
    return;
  }
  body[field] = value.trim();
};

/** Tập luật áp dụng cho một game (dùng chung cho cả POST và PUT) */
const gameRules = [
  requiredString('title', 'Tên game (title)'),
  requiredString('genre', 'Thể loại (genre)'),
  requiredPositiveNumber('price', 'Giá (price)'),
  optionalString('developer', 'Nhà phát triển (developer)'),
  optionalNumber('releaseYear', 'Năm phát hành (releaseYear)', { min: 1970, max: 2100 }),
  optionalNumber('rating', 'Điểm đánh giá (rating)', { min: 0, max: 10 }),
  optionalNumber('stock', 'Số lượng tồn (stock)', { min: 0 }),
  optionalString('coverUrl', 'Ảnh bìa (coverUrl)'),
];

/**
 * Sinh ra middleware kiểm tra dữ liệu từ một tập luật.
 * @param {Array<(body: object, errors: any[]) => void>} rules
 */
export const validateBody = (rules = gameRules) => (req, res, next) => {
  if (!isPlainObject(req.body)) {
    return next(
      ApiError.badRequest(
        'Body của request phải là một JSON object. Kiểm tra lại header Content-Type: application/json.',
        [{ field: 'body', message: 'Thiếu body hoặc body không phải JSON object.' }],
      ),
    );
  }

  const errors = [];
  for (const rule of rules) rule(req.body, errors);

  if (errors.length > 0) {
    return next(
      ApiError.badRequest(
        `Dữ liệu không hợp lệ: có ${errors.length} lỗi cần sửa.`,
        errors,
      ),
    );
  }

  next();
};

/** Middleware dựng sẵn cho tài nguyên game */
export const validateGame = validateBody(gameRules);
