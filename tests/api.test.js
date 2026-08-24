import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Trỏ "database" sang file tạm TRƯỚC khi import app, để bộ test không
// đụng vào data.json thật của project.
const TMP_DATA = path.join(os.tmpdir(), `games.test.${process.pid}.json`);
process.env.DATA_FILE = TMP_DATA;
process.env.API_KEY = 'super-secret-key';

const { createApp } = await import('../src/app.js');

/** Mở server trên cổng ngẫu nhiên, trả về base URL + hàm đóng server */
const startServer = () =>
  new Promise((resolve) => {
    const server = createApp().listen(0, () => {
      const { port } = server.address();
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });

const KEY = 'super-secret-key';
const jsonHeaders = { 'Content-Type': 'application/json' };
const authHeaders = { ...jsonHeaders, 'x-api-key': KEY };

let srv;

test.before(async () => {
  await fs.rm(TMP_DATA, { force: true });
  srv = await startServer();
});

test.after(async () => {
  await srv.close();
  await fs.rm(TMP_DATA, { force: true });
});

/* ==========================================================================
 * YÊU CẦU 1 — CRUD & Routing
 * ========================================================================== */

test('YC1 · GET /api/games trả về danh sách game', async () => {
  const res = await fetch(`${srv.base}/api/games`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data), 'data phải là một mảng');
  assert.ok(body.data.length > 0, 'phải có dữ liệu mẫu');
  assert.ok(body.meta.total >= body.data.length);
});

test('YC1 · GET /api/games/:id trả về đúng game', async () => {
  const all = await (await fetch(`${srv.base}/api/games`)).json();
  const target = all.data[0];

  const res = await fetch(`${srv.base}/api/games/${target.id}`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.id, target.id);
  assert.equal(body.data.title, target.title);
});

test('YC1 · GET /api/games/:id với id không tồn tại trả 404', async () => {
  const res = await fetch(`${srv.base}/api/games/khong-ton-tai-999`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('YC1 · POST /api/games tạo game mới', async () => {
  const payload = { title: 'Test Game POST', genre: 'Puzzle', price: 99000 };

  const res = await fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.data.title, payload.title);
  assert.ok(body.data.id, 'server phải sinh id');
  assert.ok(body.data.createdAt, 'server phải gắn createdAt');

  // Ghi xuống file thật sự, đọc lại vẫn còn
  const check = await fetch(`${srv.base}/api/games/${body.data.id}`);
  assert.equal(check.status, 200);
});

test('YC1 · PUT /api/games/:id cập nhật game', async () => {
  const created = await (
    await fetch(`${srv.base}/api/games`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Test Game PUT', genre: 'Racing', price: 150000 }),
    })
  ).json();

  const res = await fetch(`${srv.base}/api/games/${created.data.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ title: 'Test Game PUT v2', genre: 'Racing', price: 175000 }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.title, 'Test Game PUT v2');
  assert.equal(body.data.price, 175000);
  assert.equal(body.data.id, created.data.id, 'id phải giữ nguyên');
  assert.notEqual(body.data.updatedAt, created.data.updatedAt, 'updatedAt phải đổi');
});

test('YC1 · DELETE /api/games/:id xoá game', async () => {
  const created = await (
    await fetch(`${srv.base}/api/games`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Test Game DELETE', genre: 'Horror', price: 210000 }),
    })
  ).json();

  const res = await fetch(`${srv.base}/api/games/${created.data.id}`, {
    method: 'DELETE',
    headers: { 'x-api-key': KEY },
  });

  assert.equal(res.status, 200);

  const after = await fetch(`${srv.base}/api/games/${created.data.id}`);
  assert.equal(after.status, 404, 'game đã xoá thì không tìm thấy nữa');
});

/* ==========================================================================
 * YÊU CẦU 2 — Lọc theo thể loại
 * ========================================================================== */

test('YC2 · GET /api/games?genre=RPG chỉ trả game RPG', async () => {
  const res = await fetch(`${srv.base}/api/games?genre=RPG`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.ok(body.data.length > 0, 'phải có ít nhất một game RPG');
  assert.ok(
    body.data.every((game) => game.genre.toLowerCase() === 'rpg'),
    'mọi phần tử trả về đều phải thuộc thể loại RPG',
  );
});

test('YC2 · không truyền genre thì trả về toàn bộ', async () => {
  const all = await (await fetch(`${srv.base}/api/games?limit=100`)).json();
  const rpg = await (await fetch(`${srv.base}/api/games?genre=RPG&limit=100`)).json();

  assert.ok(all.meta.total > rpg.meta.total, 'danh sách đầy đủ phải nhiều hơn danh sách đã lọc');
});

test('YC2 · lọc genre không phân biệt hoa thường', async () => {
  const upper = await (await fetch(`${srv.base}/api/games?genre=RPG`)).json();
  const lower = await (await fetch(`${srv.base}/api/games?genre=rpg`)).json();

  assert.equal(upper.meta.total, lower.meta.total);
});

test('YC2 · genre không tồn tại trả về mảng rỗng, không phải lỗi', async () => {
  const res = await fetch(`${srv.base}/api/games?genre=KhongCoTheLoaiNay`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.deepEqual(body.data, []);
  assert.equal(body.meta.total, 0);
});

/* ==========================================================================
 * YÊU CẦU 3.2 — API Key Guard
 * ========================================================================== */

test('YC3 · POST thiếu x-api-key bị chặn 401', async () => {
  const res = await fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ title: 'Hacker Game', genre: 'RPG', price: 1000 }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error.message, 'Lỗi: Sai hoặc thiếu API Key!');
});

test('YC3 · POST với x-api-key sai bị chặn 401', async () => {
  const res = await fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: { ...jsonHeaders, 'x-api-key': 'sai-be-bet' },
    body: JSON.stringify({ title: 'Hacker Game 2', genre: 'RPG', price: 1000 }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error.message, 'Lỗi: Sai hoặc thiếu API Key!');
});

test('YC3 · PUT và DELETE cũng bị API Key Guard chặn', async () => {
  const put = await fetch(`${srv.base}/api/games/bat-ky`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ title: 'X', genre: 'Y', price: 1 }),
  });
  const del = await fetch(`${srv.base}/api/games/bat-ky`, { method: 'DELETE' });

  assert.equal(put.status, 401);
  assert.equal(del.status, 401);
});

test('YC3 · GET không cần API key', async () => {
  const res = await fetch(`${srv.base}/api/games`);
  assert.equal(res.status, 200);
});

/* ==========================================================================
 * YÊU CẦU 3.3 — Data Validator
 * ========================================================================== */

const postInvalid = (payload) =>
  fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

test('YC3 · title rỗng bị 400', async () => {
  const res = await postInvalid({ title: '   ', genre: 'RPG', price: 100 });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.ok(body.error.details.some((e) => e.field === 'title'));
});

test('YC3 · genre không phải chuỗi bị 400', async () => {
  const res = await postInvalid({ title: 'Game hợp lệ', genre: 123, price: 100 });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.ok(body.error.details.some((e) => e.field === 'genre'));
});

test('YC3 · price không phải số bị 400', async () => {
  const res = await postInvalid({ title: 'Game hợp lệ 2', genre: 'RPG', price: 'rẻ lắm' });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.ok(body.error.details.some((e) => e.field === 'price'));
});

test('YC3 · price <= 0 bị 400', async () => {
  for (const price of [0, -1, -99000]) {
    const res = await postInvalid({ title: `Game giá ${price}`, genre: 'RPG', price });
    assert.equal(res.status, 400, `price = ${price} phải bị từ chối`);
  }
});

test('YC3 · validator gom tất cả lỗi trong một lần trả về', async () => {
  const res = await postInvalid({ title: '', genre: '', price: -5 });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error.details.length, 3, 'phải liệt kê đủ cả 3 lỗi');
});

test('YC3 · dữ liệu sai thì KHÔNG được ghi vào file', async () => {
  const before = await (await fetch(`${srv.base}/api/games?limit=100`)).json();
  await postInvalid({ title: '', genre: '', price: -5 });
  const after = await (await fetch(`${srv.base}/api/games?limit=100`)).json();

  assert.equal(after.meta.total, before.meta.total, 'số lượng game không được thay đổi');
});

test('YC3 · PUT cũng chạy qua validator', async () => {
  const all = await (await fetch(`${srv.base}/api/games`)).json();

  const res = await fetch(`${srv.base}/api/games/${all.data[0].id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ title: 'OK', genre: 'OK', price: -1 }),
  });

  assert.equal(res.status, 400);
});

test('YC3 · API Key được kiểm tra TRƯỚC validator', async () => {
  // Body sai bét + không có key -> phải trả 401 (chặn ở cửa), không phải 400
  const res = await fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ title: '', genre: '', price: -5 }),
  });

  assert.equal(res.status, 401);
});

/* ==========================================================================
 * Phần mở rộng
 * ========================================================================== */

test('EXT · trùng tên game bị từ chối với 409', async () => {
  const payload = { title: 'Game Trùng Tên', genre: 'Indie', price: 50000 };

  const first = await fetch(`${srv.base}/api/games`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
  });
  const second = await fetch(`${srv.base}/api/games`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
});

test('EXT · phân trang trả đúng meta', async () => {
  const res = await fetch(`${srv.base}/api/games?page=1&limit=2`);
  const body = await res.json();

  assert.equal(body.data.length, 2);
  assert.equal(body.meta.page, 1);
  assert.equal(body.meta.limit, 2);
  assert.equal(body.meta.hasPrevPage, false);
  assert.equal(body.meta.hasNextPage, true);
});

test('EXT · sắp xếp theo giá giảm dần', async () => {
  const res = await fetch(`${srv.base}/api/games?sortBy=price&order=desc&limit=100`);
  const body = await res.json();

  const prices = body.data.map((g) => g.price);
  const sorted = [...prices].sort((a, b) => b - a);
  assert.deepEqual(prices, sorted);
});

test('EXT · JSON body sai cú pháp trả 400 chứ không sập server', async () => {
  const res = await fetch(`${srv.base}/api/games`, {
    method: 'POST',
    headers: authHeaders,
    body: '{ "title": "thiếu ngoặc" ',
  });

  assert.equal(res.status, 400);
});

test('EXT · route không tồn tại trả 404 kèm gợi ý', async () => {
  const res = await fetch(`${srv.base}/api/khong-co-dau`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.ok(Array.isArray(body.error.details.availableEndpoints));
});

test('EXT · mọi response đều có requestId để truy vết', async () => {
  const res = await fetch(`${srv.base}/api/games`);
  const body = await res.json();

  assert.ok(body.requestId, 'body phải có requestId');
  assert.ok(res.headers.get('x-request-id'), 'header phải có X-Request-Id');
});

test('EXT · POST song song không làm mất dữ liệu (kiểm tra khoá ghi)', async () => {
  const before = await (await fetch(`${srv.base}/api/games?limit=100`)).json();

  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      fetch(`${srv.base}/api/games`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: `Song song ${i}`, genre: 'Stress', price: 1000 + i }),
      }),
    ),
  );

  const after = await (await fetch(`${srv.base}/api/games?limit=100`)).json();
  assert.equal(after.meta.total, before.meta.total + 10, 'đủ 10 bản ghi, không mất bản nào');
});
