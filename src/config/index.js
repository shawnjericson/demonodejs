import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Thư mục gốc của project (E:/Nodejs) */
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

/**
 * Đang chạy trên nền tảng serverless (Vercel) hay không.
 * Nơi đó toàn bộ thư mục mã nguồn là CHỈ ĐỌC, chỉ có /tmp mới ghi được.
 */
export const isServerless = Boolean(process.env.VERCEL);

/**
 * Chọn nơi đặt "database":
 *   - DATA_FILE  : do người dùng chỉ định (bộ test dùng đường dẫn tạm)
 *   - Vercel     : /tmp/data.json — thư mục duy nhất ghi được.
 *                  File này rỗng ở lần chạy nguội đầu tiên, repository sẽ
 *                  tự sinh lại dữ liệu mẫu, nên API vẫn hoạt động đầy đủ.
 *   - Máy cá nhân: data/data.json trong thư mục dự án
 */
const resolveDataFile = () => {
  if (process.env.DATA_FILE) return path.resolve(process.env.DATA_FILE);
  if (isServerless) return path.join('/tmp', 'data.json');
  return path.join(ROOT_DIR, 'data', 'data.json');
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',

  /** Khoá bí mật bảo vệ các thao tác ghi dữ liệu */
  apiKey: process.env.API_KEY || 'super-secret-key',

  /** File JSON đóng vai trò "database" (test có thể trỏ sang file tạm) */
  dataFile: resolveDataFile(),

  /** Thư mục chứa trang API Console */
  publicDir: path.join(ROOT_DIR, 'public'),

  /** Giới hạn mặc định khi phân trang */
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

export const isDev = config.env !== 'production';
