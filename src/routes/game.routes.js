import { Router } from 'express';

import * as controller from '../controllers/game.controller.js';
import { apiKeyGuard } from '../middlewares/apiKey.middleware.js';
import { validateGame } from '../middlewares/validate.middleware.js';

const router = Router();

/**
 * Bản đồ pipeline của tài nguyên /api/games
 *
 *  Method  Đường dẫn        Middleware chạy trước controller
 *  ------  ---------------  --------------------------------------------
 *  GET     /                (không) — endpoint công khai
 *  GET     /stats           (không)
 *  GET     /:id             (không)
 *  POST    /                apiKeyGuard -> validateGame
 *  PUT     /:id             apiKeyGuard -> validateGame
 *  DELETE  /:id             apiKeyGuard
 *
 * Thứ tự apiKeyGuard trước validateGame là có chủ đích: kẻ không có quyền
 * sẽ bị chặn ngay ở cửa, không cần và cũng không nên biết dữ liệu của họ
 * sai ở chỗ nào.
 */

// ---- Đọc dữ liệu: công khai ------------------------------------------------
// /stats phải đứng trước /:id, nếu không "stats" sẽ bị hiểu là một id.
router.get('/stats', controller.getStats);
router.get('/', controller.getGames);
router.get('/:id', controller.getGameById);

// ---- Ghi dữ liệu: bắt buộc có API key -------------------------------------
router.post('/', apiKeyGuard, validateGame, controller.createGame);
router.put('/:id', apiKeyGuard, validateGame, controller.updateGame);
router.delete('/:id', apiKeyGuard, controller.deleteGame);

export default router;
