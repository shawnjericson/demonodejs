import { createApp } from './app.js';
import { config } from './config/index.js';
import { paint, log } from './utils/logger.js';
import * as repo from './repositories/game.repository.js';

const app = createApp();

const banner = (port, gameCount) => {
  const url = `http://localhost:${port}`;
  const line = paint.gray('─'.repeat(58));

  console.log(`
${line}
  ${paint.bold(paint.magenta('🎮  GAME STORE API'))}  ${paint.gray('· Express.js REST API')}
${line}
  ${paint.gray('Trạng thái  :')} ${paint.green('● đang chạy')}
  ${paint.gray('Môi trường  :')} ${config.env}
  ${paint.gray('Kho dữ liệu :')} ${config.dataFile}
  ${paint.gray('Số game     :')} ${paint.bold(gameCount)}

  ${paint.gray('API Console :')} ${paint.cyan(paint.bold(url))}
  ${paint.gray('Endpoints   :')} ${paint.cyan(`${url}/api`)}
  ${paint.gray('Health      :')} ${paint.cyan(`${url}/api/health`)}

  ${paint.gray('API Key cho POST/PUT/DELETE:')} ${paint.yellow(config.apiKey)}
${line}
  ${paint.gray('Nhấn Ctrl + C để dừng server')}
`);
};

const bootstrap = async () => {
  // Chạm vào kho dữ liệu ngay lúc khởi động: nếu data.json chưa có thì tạo
  // sẵn kèm dữ liệu mẫu, và nếu file hỏng thì báo lỗi ngay thay vì lúc
  // request đầu tiên của người dùng.
  const games = await repo.readAll();

  const server = app.listen(config.port, () => banner(config.port, games.length));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log.error(
        `Cổng ${config.port} đang bị chiếm bởi tiến trình khác.`,
        paint.gray('Đổi cổng bằng: PORT=4000 npm start'),
      );
      process.exit(1);
    }
    throw err;
  });

  // Tắt server êm ái: ngừng nhận kết nối mới, xử lý nốt request đang chạy
  const shutdown = (signal) => () => {
    console.log();
    log.warn(`Nhận tín hiệu ${signal}, đang tắt server...`);
    server.close(() => {
      log.success('Server đã dừng an toàn. Tạm biệt!');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
};

bootstrap().catch((err) => {
  log.error('Không thể khởi động server:');
  console.error(err);
  process.exit(1);
});
