import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { config } from '../config/index.js';

/**
 * Tầng truy cập dữ liệu: đọc/ghi trực tiếp file data.json.
 *
 * Hai vấn đề của "database bằng file" đã được xử lý ở đây:
 *  1. Ghi đồng thời  -> nối các thao tác ghi vào một hàng đợi tuần tự (mutex).
 *  2. Ghi dở dang    -> ghi ra file .tmp rồi rename, thao tác rename là atomic
 *                       nên file data.json không bao giờ ở trạng thái hỏng.
 */

/** Hàng đợi bảo đảm tại một thời điểm chỉ có duy nhất một thao tác ghi */
let writeQueue = Promise.resolve();

const withLock = (task) => {
  const result = writeQueue.then(task, task);
  // Nuốt lỗi ở nhánh hàng đợi để một lần ghi lỗi không chặn các lần sau
  writeQueue = result.catch(() => {});
  return result;
};

/** Dữ liệu mẫu, dùng khi data.json chưa tồn tại */
const seedGames = () => [
  {
    id: randomUUID(),
    title: 'The Witcher 3: Wild Hunt',
    genre: 'RPG',
    price: 299000,
    developer: 'CD Projekt Red',
    releaseYear: 2015,
    rating: 9.8,
    stock: 42,
    coverUrl: '/covers/the-witcher-3.webp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Elden Ring',
    genre: 'RPG',
    price: 990000,
    developer: 'FromSoftware',
    releaseYear: 2022,
    rating: 9.6,
    stock: 17,
    coverUrl: '/covers/elden-ring.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Hollow Knight',
    genre: 'Metroidvania',
    price: 175000,
    developer: 'Team Cherry',
    releaseYear: 2017,
    rating: 9.4,
    stock: 88,
    coverUrl: '/covers/hollow-knight.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'DOOM Eternal',
    genre: 'FPS',
    price: 490000,
    developer: 'id Software',
    releaseYear: 2020,
    rating: 8.9,
    stock: 63,
    coverUrl: '/covers/doom-eternal.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Stardew Valley',
    genre: 'Simulation',
    price: 128000,
    developer: 'ConcernedApe',
    releaseYear: 2016,
    rating: 9.2,
    stock: 120,
    coverUrl: '/covers/stardew-valley.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Hades',
    genre: 'Roguelike',
    price: 245000,
    developer: 'Supergiant Games',
    releaseYear: 2020,
    rating: 9.3,
    stock: 55,
    coverUrl: '/covers/hades.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'FIFA 24',
    genre: 'Sports',
    price: 1290000,
    developer: 'EA Sports',
    releaseYear: 2023,
    rating: 7.4,
    stock: 30,
    coverUrl: '/covers/fifa-24.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Baldur\u2019s Gate 3',
    genre: 'RPG',
    price: 1190000,
    developer: 'Larian Studios',
    releaseYear: 2023,
    rating: 9.9,
    stock: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/** Ghi xuống đĩa, KHÔNG lấy khoá — chỉ gọi từ bên trong một lượt khoá. */
const persist = async (games) => {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });

  const tmpFile = `${config.dataFile}.${process.pid}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(games, null, 2), 'utf8');
  await fs.rename(tmpFile, config.dataFile);

  return games;
};

/** Đọc file, KHÔNG lấy khoá. Tự tạo file kèm data mẫu nếu chưa tồn tại. */
const load = async () => {
  try {
    const raw = await fs.readFile(config.dataFile, 'utf8');
    const parsed = JSON.parse(raw);

    // Chấp nhận cả 2 dạng: mảng thuần hoặc { games: [...] }
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.games)) return parsed.games;

    throw new Error('data.json không đúng định dạng: cần một mảng games');
  } catch (err) {
    if (err.code === 'ENOENT') {
      const games = seedGames();
      await persist(games);
      return games;
    }
    if (err instanceof SyntaxError) {
      throw new Error(`data.json bị lỗi cú pháp JSON: ${err.message}`);
    }
    throw err;
  }
};

/** Đọc toàn bộ danh sách game. */
export const readAll = () => load();

/** Ghi đè toàn bộ danh sách xuống đĩa (có khoá). */
export const writeAll = (games) => withLock(() => persist(games));

/**
 * Đọc – biến đổi – ghi trong cùng một lượt khoá.
 * Nhờ vậy hai request POST bắn cùng lúc không ghi đè kết quả của nhau.
 *
 * @param {(games: any[]) => { games: any[], result: any }} mutator
 */
export const transaction = (mutator) =>
  withLock(async () => {
    const { games, result } = mutator(await load());
    await persist(games);
    return result;
  });
