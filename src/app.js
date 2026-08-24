import express from 'express';

import { config } from './config/index.js';
import apiRoutes from './routes/index.js';
import { requestId } from './middlewares/requestId.middleware.js';
import { logger } from './middlewares/logger.middleware.js';
import { notFound } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

/**
 * Khởi tạo Express app.
 * Tách khỏi server.js để test có thể import app mà không cần listen cổng thật.
 *
 * THỨ TỰ MIDDLEWARE (chạy từ trên xuống dưới):
 *
 *   request  ─▶ requestId ─▶ logger ─▶ body parser ─▶ static ─▶ /api routes
 *                                                                   │
 *                                          apiKeyGuard ─▶ validator ─┤ (POST/PUT/DELETE)
 *                                                                   ▼
 *                                                              controller
 *                                                                   │
 *              errorHandler ◀── notFound ◀───────────────────────────┘
 *
 * Sai thứ tự này là nguồn gốc của phần lớn bug trong Express: ví dụ đặt
 * errorHandler trước routes thì nó sẽ không bao giờ bắt được lỗi.
 */
export const createApp = () => {
  const app = express();

  app.disable('x-powered-by'); // không tiết lộ công nghệ backend
  app.set('json spaces', 2);

  // 1) Gắn requestId trước tiên để mọi log và response đều truy vết được
  app.use(requestId);

  // 2) YÊU CẦU 3.1 — Logger toàn cục, đặt sớm để ghi nhận cả request lỗi
  app.use(logger);

  // 3) Body parser: chuyển JSON trong body thành req.body
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 4) Trang API Console tĩnh tại http://localhost:PORT/
  app.use(express.static(config.publicDir));

  // 5) Toàn bộ API nằm dưới tiền tố /api
  app.use('/api', apiRoutes);

  // 6) Không route nào khớp -> 404 có kèm gợi ý
  app.use(notFound);

  // 7) Chốt chặn cuối cùng: mọi lỗi đều quy về một nơi
  app.use(errorHandler);

  return app;
};

export default createApp;
