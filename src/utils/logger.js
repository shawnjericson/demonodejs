/**
 * Logger tối giản, tô màu bằng ANSI escape code — không cần thư viện ngoài.
 * Tự tắt màu khi output không phải TTY (vd: khi pipe ra file log).
 */
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

const wrap = (open, close) => (text) =>
  supportsColor ? `\u001b[${open}m${text}\u001b[${close}m` : String(text);

export const paint = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
  white: wrap(97, 39),
};

/** Màu riêng cho từng HTTP method, nhìn log là nhận ra ngay */
export const methodColor = {
  GET: paint.green,
  POST: paint.yellow,
  PUT: paint.blue,
  PATCH: paint.magenta,
  DELETE: paint.red,
};

/** Màu theo nhóm status code: 2xx xanh, 3xx cyan, 4xx vàng, 5xx đỏ */
export const statusColor = (status) => {
  if (status >= 500) return paint.red;
  if (status >= 400) return paint.yellow;
  if (status >= 300) return paint.cyan;
  return paint.green;
};

/** Định dạng thời gian dạng HH:mm:ss.mmm theo giờ máy local */
export const formatTime = (date = new Date()) => {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return (
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}`
  );
};

/** Làm đẹp thời lượng: <1ms, 12ms, 1.24s */
export const formatDuration = (ms) => {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const log = {
  info: (...args) => console.log(paint.cyan('ℹ'), ...args),
  success: (...args) => console.log(paint.green('✔'), ...args),
  warn: (...args) => console.warn(paint.yellow('⚠'), ...args),
  error: (...args) => console.error(paint.red('✖'), ...args),
};
