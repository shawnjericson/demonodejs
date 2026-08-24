import { randomUUID } from 'node:crypto';

import * as repo from '../repositories/game.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/index.js';

/** Bỏ dấu tiếng Việt + hạ chữ thường để so khớp "khong dau" cũng ra kết quả */
const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

const SORTABLE_FIELDS = ['title', 'price', 'genre', 'rating', 'releaseYear', 'createdAt'];

/**
 * YÊU CẦU 1 + 2 — Lấy danh sách game, hỗ trợ lọc / tìm kiếm / sắp xếp / phân trang.
 *
 * @param {object} query  req.query đã đi qua Express
 */
export const list = async (query = {}) => {
  const all = await repo.readAll();
  let items = [...all];

  // --- YÊU CẦU 2: lọc theo thể loại (?genre=RPG) ---------------------------
  // So khớp không phân biệt hoa/thường và dấu; cho phép nhiều thể loại: ?genre=RPG,FPS
  if (query.genre) {
    const wanted = String(query.genre)
      .split(',')
      .map(normalize)
      .filter(Boolean);

    if (wanted.length) {
      items = items.filter((game) => wanted.includes(normalize(game.genre)));
    }
  }

  // --- Bộ lọc mở rộng ------------------------------------------------------
  if (query.q) {
    const keyword = normalize(query.q);
    items = items.filter(
      (game) =>
        normalize(game.title).includes(keyword) ||
        normalize(game.developer).includes(keyword),
    );
  }

  if (query.minPrice !== undefined && query.minPrice !== '') {
    const min = Number(query.minPrice);
    if (Number.isNaN(min)) throw ApiError.badRequest('minPrice phải là một số.');
    items = items.filter((game) => Number(game.price) >= min);
  }

  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    const max = Number(query.maxPrice);
    if (Number.isNaN(max)) throw ApiError.badRequest('maxPrice phải là một số.');
    items = items.filter((game) => Number(game.price) <= max);
  }

  // --- Sắp xếp -------------------------------------------------------------
  const sortBy = query.sortBy || 'createdAt';
  if (!SORTABLE_FIELDS.includes(sortBy)) {
    throw ApiError.badRequest(
      `Không thể sắp xếp theo "${sortBy}". Các trường hợp lệ: ${SORTABLE_FIELDS.join(', ')}.`,
    );
  }
  const direction = String(query.order || 'asc').toLowerCase() === 'desc' ? -1 : 1;

  items.sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }
    return String(left ?? '').localeCompare(String(right ?? ''), 'vi') * direction;
  });

  // --- Phân trang ----------------------------------------------------------
  const total = items.length;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    config.pagination.maxLimit,
    Math.max(1, Number(query.limit) || config.pagination.defaultLimit),
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    items: paged,
    meta: {
      total,
      count: paged.length,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      filters: {
        genre: query.genre ?? null,
        q: query.q ?? null,
        minPrice: query.minPrice ?? null,
        maxPrice: query.maxPrice ?? null,
      },
      sort: { by: sortBy, order: direction === 1 ? 'asc' : 'desc' },
    },
  };
};

/** YÊU CẦU 1 — Lấy chi tiết một game theo id */
export const getById = async (id) => {
  const games = await repo.readAll();
  const game = games.find((item) => String(item.id) === String(id));

  if (!game) throw ApiError.notFound(`Không tìm thấy game với id "${id}".`);
  return game;
};

/** YÊU CẦU 1 — Thêm game mới */
export const create = (payload) =>
  repo.transaction((games) => {
    // Chặn trùng tên (không phân biệt hoa thường) để dữ liệu sạch
    const duplicated = games.some(
      (game) => normalize(game.title) === normalize(payload.title),
    );
    if (duplicated) {
      throw ApiError.conflict(`Game "${payload.title}" đã tồn tại trong kho.`);
    }

    const now = new Date().toISOString();
    const game = {
      id: randomUUID(),
      title: payload.title,
      genre: payload.genre,
      price: payload.price,
      developer: payload.developer ?? 'Đang cập nhật',
      releaseYear: payload.releaseYear ?? new Date().getFullYear(),
      rating: payload.rating ?? 0,
      stock: payload.stock ?? 0,
      coverUrl: payload.coverUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return { games: [...games, game], result: game };
  });

/** YÊU CẦU 1 — Cập nhật game theo id */
export const update = (id, payload) =>
  repo.transaction((games) => {
    const index = games.findIndex((game) => String(game.id) === String(id));
    if (index === -1) {
      throw ApiError.notFound(`Không tìm thấy game với id "${id}" để cập nhật.`);
    }

    const duplicated = games.some(
      (game, i) => i !== index && normalize(game.title) === normalize(payload.title),
    );
    if (duplicated) {
      throw ApiError.conflict(`Đã có game khác mang tên "${payload.title}".`);
    }

    const updated = {
      ...games[index],
      ...payload,
      id: games[index].id, // id là bất biến, không cho client ghi đè
      createdAt: games[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    const next = [...games];
    next[index] = updated;

    return { games: next, result: updated };
  });

/** YÊU CẦU 1 — Xoá game theo id */
export const remove = (id) =>
  repo.transaction((games) => {
    const index = games.findIndex((game) => String(game.id) === String(id));
    if (index === -1) {
      throw ApiError.notFound(`Không tìm thấy game với id "${id}" để xoá.`);
    }

    const [deleted] = games.splice(index, 1);
    return { games, result: deleted };
  });

/** Thống kê nhanh phục vụ trang API Console */
export const stats = async () => {
  const games = await repo.readAll();

  const byGenre = games.reduce((acc, game) => {
    acc[game.genre] = (acc[game.genre] || 0) + 1;
    return acc;
  }, {});

  const prices = games.map((game) => Number(game.price) || 0);
  const totalValue = prices.reduce((sum, price) => sum + price, 0);

  return {
    totalGames: games.length,
    genres: Object.keys(byGenre).sort(),
    countByGenre: byGenre,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      average: prices.length ? Math.round(totalValue / prices.length) : 0,
    },
  };
};
