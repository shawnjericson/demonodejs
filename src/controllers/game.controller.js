import * as gameService from '../services/game.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';

/**
 * Tầng controller chỉ làm đúng ba việc:
 *   1. Lấy dữ liệu từ req (params / query / body)
 *   2. Gọi service tương ứng
 *   3. Trả response theo format chuẩn
 * Toàn bộ nghiệp vụ nằm ở service, nên controller luôn mỏng và dễ đọc.
 */

/** GET /api/games — danh sách, hỗ trợ ?genre=&q=&sortBy=&order=&page=&limit= */
export const getGames = asyncHandler(async (req, res) => {
  const { items, meta } = await gameService.list(req.query);

  return ok(res, {
    data: items,
    meta,
    message: req.query.genre
      ? `Tìm thấy ${meta.total} game thuộc thể loại "${req.query.genre}".`
      : `Lấy danh sách game thành công (${meta.total} game).`,
  });
});

/** GET /api/games/:id — chi tiết một game */
export const getGameById = asyncHandler(async (req, res) => {
  const game = await gameService.getById(req.params.id);
  return ok(res, { data: game, message: `Chi tiết game "${game.title}".` });
});

/** POST /api/games — thêm mới (yêu cầu API key + dữ liệu hợp lệ) */
export const createGame = asyncHandler(async (req, res) => {
  const game = await gameService.create(req.body);

  res.setHeader('Location', `/api/games/${game.id}`);
  return created(res, { data: game, message: `Đã thêm game "${game.title}" vào kho.` });
});

/** PUT /api/games/:id — cập nhật (yêu cầu API key + dữ liệu hợp lệ) */
export const updateGame = asyncHandler(async (req, res) => {
  const game = await gameService.update(req.params.id, req.body);
  return ok(res, { data: game, message: `Đã cập nhật game "${game.title}".` });
});

/** DELETE /api/games/:id — xoá (yêu cầu API key) */
export const deleteGame = asyncHandler(async (req, res) => {
  const game = await gameService.remove(req.params.id);
  return ok(res, { data: game, message: `Đã xoá game "${game.title}" khỏi kho.` });
});

/** GET /api/games/stats — thống kê nhanh, phục vụ dashboard */
export const getStats = asyncHandler(async (req, res) => {
  const data = await gameService.stats();
  return ok(res, { data, message: 'Thống kê kho game.' });
});
