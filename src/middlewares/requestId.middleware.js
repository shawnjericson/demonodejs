import { randomUUID } from 'node:crypto';

/**
 * Gắn cho mỗi request một mã định danh duy nhất.
 * Mã này xuất hiện cả trong log lẫn response, nên khi user báo lỗi
 * chỉ cần đưa requestId là tra được đúng dòng log tương ứng.
 */
export const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID().slice(0, 8);
  res.setHeader('X-Request-Id', req.id);
  next();
};
