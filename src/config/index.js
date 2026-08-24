import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thư mục gốc của project (E:/Nodejs) */
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

export const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',

  /** Khoá bí mật bảo vệ các thao tác ghi dữ liệu */
  apiKey: process.env.API_KEY || 'super-secret-key',

  /** File JSON đóng vai trò "database" (test có thể trỏ sang file tạm) */
  dataFile: process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.join(ROOT_DIR, 'data', 'data.json'),

  /** Thư mục chứa trang API Console */
  publicDir: path.join(ROOT_DIR, 'public'),

  /** Giới hạn mặc định khi phân trang */
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

export const isDev = config.env !== 'production';
