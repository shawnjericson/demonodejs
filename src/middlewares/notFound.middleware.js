import { ApiError } from '../utils/ApiError.js';

/**
 * Bắt mọi request không khớp route nào phía trên.
 * Trả về 404 kèm gợi ý các endpoint hợp lệ để người gọi tự sửa nhanh.
 */
export const notFound = (req, res, next) => {
  next(
    new ApiError(404, `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`, {
      code: 'ROUTE_NOT_FOUND',
      details: {
        availableEndpoints: [
          'GET    /api/games',
          'GET    /api/games/:id',
          'POST   /api/games',
          'PUT    /api/games/:id',
          'DELETE /api/games/:id',
          'GET    /api/health',
        ],
      },
    }),
  );
};
