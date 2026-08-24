/**
 * Chuẩn hoá format response để client luôn nhận đúng một hình dạng dữ liệu.
 *
 * Thành công: { success: true, message, data, meta?, requestId, timestamp }
 * Thất bại:   { success: false, error: { code, message, details? }, ... }
 */
export const ok = (res, { data, message = 'Thành công', meta, status = 200 }) =>
  res.status(status).json({
    success: true,
    message,
    ...(meta ? { meta } : {}),
    data,
    requestId: res.req.id,
    timestamp: new Date().toISOString(),
  });

export const created = (res, { data, message = 'Tạo mới thành công' }) =>
  ok(res, { data, message, status: 201 });

export const fail = (res, { status = 500, code, message, details }) =>
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    requestId: res.req.id,
    timestamp: new Date().toISOString(),
  });
