import { Router } from 'express';

import gameRoutes from './game.routes.js';
import { config } from '../config/index.js';
import { ok } from '../utils/ApiResponse.js';

const router = Router();

/** Health check — dùng cho monitoring hoặc kiểm tra server còn sống */
router.get('/health', (req, res) =>
  ok(res, {
    message: 'Server đang hoạt động bình thường.',
    data: {
      status: 'healthy',
      env: config.env,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
    },
  }),
);

/** Trang chỉ mục API — liệt kê toàn bộ endpoint kèm mô tả */
router.get('/', (req, res) =>
  ok(res, {
    message: 'Game Store API v1',
    data: {
      name: 'Game Store API',
      version: '1.0.0',
      endpoints: [
        { method: 'GET', path: '/api/games', auth: false, desc: 'Danh sách game, hỗ trợ lọc ?genre=' },
        { method: 'GET', path: '/api/games/stats', auth: false, desc: 'Thống kê kho game' },
        { method: 'GET', path: '/api/games/:id', auth: false, desc: 'Chi tiết một game' },
        { method: 'POST', path: '/api/games', auth: true, desc: 'Thêm game mới' },
        { method: 'PUT', path: '/api/games/:id', auth: true, desc: 'Cập nhật game' },
        { method: 'DELETE', path: '/api/games/:id', auth: true, desc: 'Xoá game' },
      ],
      auth: {
        header: 'x-api-key',
        appliesTo: ['POST', 'PUT', 'DELETE'],
      },
    },
  }),
);

router.use('/games', gameRoutes);

export default router;
