import { paint, methodColor, statusColor, formatTime, formatDuration } from '../utils/logger.js';

/**
 * ============================================================================
 * YÊU CẦU 3.1 — LOGGER MIDDLEWARE (áp dụng TOÀN CỤC)
 * ============================================================================
 * In ra console theo định dạng: [Thời gian] - [Method] - [URL]
 *
 * Phần mở rộng: middleware lắng nghe sự kiện 'finish' của response để bổ sung
 * status code và thời gian xử lý — hai thông tin quan trọng nhất khi debug.
 *
 * Ví dụ output:
 *   [19:48:12.301] - [GET]    - /api/games?genre=RPG        200  4ms
 *   [19:48:15.882] - [DELETE] - /api/games/abc-123          401  1ms
 */
export const logger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const time = formatTime();

  const colorize = methodColor[req.method] || paint.white;
  const method = colorize(req.method.padEnd(6));
  const url = req.originalUrl;

  // Dòng log bắt buộc theo đề bài, in ngay khi request vừa đi vào
  const head = `${paint.gray(`[${time}]`)} - ${paint.bold(`[${req.method}]`)} - ${url}`;

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const tint = statusColor(res.statusCode);

    console.log(
      `${paint.gray(`[${time}]`)} - [${method}] - ${paint.cyan(url)} ` +
        `${tint(paint.bold(res.statusCode))} ${paint.gray(formatDuration(elapsedMs))} ` +
        `${paint.gray(`#${req.id}`)}`,
    );
  });

  // Nếu client ngắt kết nối giữa chừng, response sẽ không bao giờ 'finish'
  res.on('close', () => {
    if (!res.writableEnded) {
      console.log(`${head} ${paint.yellow('CLIENT ABORTED')}`);
    }
  });

  next();
};
