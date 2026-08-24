# 🎮 Game Store API

RESTful API quản lý kho game, viết bằng **Express.js** theo kiến trúc phân tầng.
Dữ liệu lưu trong `data/data.json` — không cần cài database.

> Bài tập ExpressJS · CRUD & Routing · Filter · Custom Middleware Pipeline

---

## 🚀 Chạy thử trong 30 giây

```bash
npm install
npm start
```

Mở trình duyệt tại **http://localhost:3000**. Dự án có sẵn **hai giao diện**:

| Trang | Dành cho | Nội dung |
|---|---|---|
| **`/`** — Game Vault | Người dùng cuối | Cửa hàng game thật: ảnh bìa, lọc thể loại, tìm kiếm, sắp xếp, phân trang, thêm/sửa/xoá qua modal |
| **`/console.html`** — API Console | Người chấm bài / lập trình viên | Bấm thẳng từng endpoint, xem raw JSON, đổi API key để thử lỗi 401/400 |

Giao diện Game Vault **không chứa dữ liệu nào của riêng nó** — mọi thứ hiển thị
đều đi qua `fetch()` tới API. Bấm nút `</>` trên thanh điều hướng để mở
**Nhật ký gọi API**, xem từng request/response thật đằng sau mỗi thao tác.

| Lệnh | Tác dụng |
|---|---|
| `npm start` | Chạy server ở cổng 3000 |
| `npm run dev` | Chạy kèm auto-reload khi sửa code |
| `npm test` | Chạy 29 test tự động kiểm chứng đủ 3 yêu cầu |

Đổi cổng: `PORT=4000 npm start`

---

## 📋 Bảng đối chiếu yêu cầu đề bài

| # | Yêu cầu | Đã làm | Nằm ở đâu |
|---|---|---|---|
| **1** | `GET /api/games` — danh sách | ✅ | [game.controller.js](src/controllers/game.controller.js) |
| **1** | `GET /api/games/:id` — chi tiết | ✅ | `getGameById` |
| **1** | `POST /api/games` — thêm mới | ✅ | `createGame` |
| **1** | `PUT /api/games/:id` — cập nhật | ✅ | `updateGame` |
| **1** | `DELETE /api/games/:id` — xoá | ✅ | `deleteGame` |
| **1** | Đọc/ghi từ file `data.json` | ✅ | [game.repository.js](src/repositories/game.repository.js) |
| **2** | Lọc `?genre=RPG`, không có thì trả toàn bộ | ✅ | [game.service.js](src/services/game.service.js) |
| **3.1** | Logger toàn cục `[Time] - [Method] - [URL]` | ✅ | [logger.middleware.js](src/middlewares/logger.middleware.js) |
| **3.2** | API Key Guard cho POST/PUT/DELETE, sai → 401 | ✅ | [apiKey.middleware.js](src/middlewares/apiKey.middleware.js) |
| **3.3** | Validator cho POST/PUT, sai → 400 và chặn lưu | ✅ | [validate.middleware.js](src/middlewares/validate.middleware.js) |

---

## 🧩 Middleware Pipeline

Đây là phần trọng tâm của bài. Thứ tự các middleware được sắp xếp có chủ đích:

```
                      ┌─────────────────────────────────────────┐
   HTTP request  ───▶ │ requestId    gắn mã truy vết cho request │
                      ├─────────────────────────────────────────┤
                      │ logger       ★ YÊU CẦU 3.1 · toàn cục    │
                      ├─────────────────────────────────────────┤
                      │ express.json parse body                  │
                      ├─────────────────────────────────────────┤
                      │ static       phục vụ trang API Console   │
                      └──────────────────┬──────────────────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │                                   │
                  GET (công khai)                POST / PUT / DELETE
                       │                                   │
                       │                    ┌──────────────▼──────────────┐
                       │                    │ apiKeyGuard ★ YÊU CẦU 3.2   │
                       │                    │ sai key → 401, dừng tại đây │
                       │                    └──────────────┬──────────────┘
                       │                                   │
                       │                    ┌──────────────▼──────────────┐
                       │                    │ validateGame ★ YÊU CẦU 3.3  │
                       │                    │ sai data → 400, không lưu   │
                       │                    └──────────────┬──────────────┘
                       │                                   │
                       └─────────────────┬─────────────────┘
                                         ▼
                                    controller → service → repository → data.json
                                         │
                       ┌─────────────────▼─────────────────┐
                       │ notFound  →  errorHandler         │
                       │ mọi lỗi quy về một chỗ duy nhất   │
                       └───────────────────────────────────┘
```

**Vì sao `apiKeyGuard` đứng trước `validateGame`?**
Người không có quyền ghi thì không cần — và không nên — biết dữ liệu của họ
sai ở chỗ nào. Chặn ngay tại cửa là đúng cả về bảo mật lẫn hiệu năng.

---

### ★ 3.1 · Logger Middleware (toàn cục)

In đúng định dạng đề bài `[Thời gian] - [Method] - [URL]`, bổ sung thêm
status code, thời gian xử lý và requestId — ba thứ cần nhất khi debug:

```
[19:59:29] - [GET   ] - /api/games?genre=RPG   200  4ms  #19b08264
[19:59:31] - [POST  ] - /api/games             201 17ms  #d178d859
[19:59:33] - [DELETE] - /api/games/abc-123     401  1ms  #ba9d18e7
```

Method và status được tô màu theo nhóm (2xx xanh, 4xx vàng, 5xx đỏ) nên
nhìn lướt qua terminal là thấy ngay request nào có vấn đề.

### ★ 3.2 · API Key Guard (POST / PUT / DELETE)

```js
router.post('/',      apiKeyGuard, validateGame, controller.createGame);
router.put('/:id',    apiKeyGuard, validateGame, controller.updateGame);
router.delete('/:id', apiKeyGuard,               controller.deleteGame);
```

- Đúng `x-api-key: super-secret-key` → đi tiếp.
- Sai hoặc thiếu → **401** kèm thông báo `"Lỗi: Sai hoặc thiếu API Key!"`.
- So sánh khoá bằng `crypto.timingSafeEqual` thay vì `===` để không rò rỉ
  thông tin qua thời gian phản hồi.

### ★ 3.3 · Data Validator (POST / PUT)

Quy tắc bắt buộc theo đề bài:

| Trường | Ràng buộc |
|---|---|
| `title` | chuỗi, không rỗng (đã trim) |
| `genre` | chuỗi, không rỗng |
| `price` | **Number** và **> 0** |

Các trường tuỳ chọn (`developer`, `releaseYear`, `rating`, `stock`, `coverUrl`)
chỉ bị kiểm tra khi client có gửi lên.

Validator gom **toàn bộ** lỗi rồi trả về một lần, thay vì báo lẻ từng lỗi:

```jsonc
// POST /api/games  với  { "title": "", "genre": 999, "price": -1 }
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Dữ liệu không hợp lệ: có 3 lỗi cần sửa.",
    "details": [
      { "field": "title", "message": "Tên game (title) không được để trống.", "received": "\"\"" },
      { "field": "genre", "message": "Thể loại (genre) phải là một chuỗi ký tự.", "received": "number" },
      { "field": "price", "message": "Giá (price) phải lớn hơn 0.", "received": -1 }
    ]
  }
}
```

Dữ liệu sai **không bao giờ chạm tới `data.json`** — validator chặn trước
khi request đi xuống controller.

---

## 📡 Danh sách endpoint

| Method | Endpoint | Auth | Mô tả |
|---|---|:---:|---|
| `GET` | `/api/games` | — | Danh sách, hỗ trợ lọc & phân trang |
| `GET` | `/api/games/stats` | — | Thống kê kho game |
| `GET` | `/api/games/:id` | — | Chi tiết một game |
| `POST` | `/api/games` | 🔐 | Thêm game mới |
| `PUT` | `/api/games/:id` | 🔐 | Cập nhật game |
| `DELETE` | `/api/games/:id` | 🔐 | Xoá game |
| `GET` | `/api/health` | — | Kiểm tra server |
| `GET` | `/api` | — | Chỉ mục API |

### Query parameters của `GET /api/games`

| Tham số | Ví dụ | Ý nghĩa |
|---|---|---|
| `genre` | `?genre=RPG` | **★ Yêu cầu 2** — lọc theo thể loại (nhận nhiều giá trị: `RPG,FPS`) |
| `q` | `?q=witcher` | Tìm theo tên game hoặc nhà phát triển |
| `minPrice` / `maxPrice` | `?minPrice=100000` | Lọc theo khoảng giá |
| `sortBy` | `?sortBy=price` | `title` `price` `genre` `rating` `releaseYear` `createdAt` |
| `order` | `?order=desc` | `asc` (mặc định) hoặc `desc` |
| `page` / `limit` | `?page=2&limit=10` | Phân trang, `limit` tối đa 100 |

Bộ lọc `genre` **không phân biệt hoa thường và bỏ qua dấu tiếng Việt**, nên
`?genre=rpg`, `?genre=RPG` đều ra cùng kết quả.

---

## 📦 Định dạng response

Mọi response đều có chung một hình dạng, client chỉ cần viết một hàm xử lý.

**Thành công**

```jsonc
{
  "success": true,
  "message": "Tìm thấy 3 game thuộc thể loại \"RPG\".",
  "meta": {
    "total": 3, "count": 3, "page": 1, "limit": 20, "totalPages": 1,
    "hasNextPage": false, "hasPrevPage": false,
    "filters": { "genre": "RPG", "q": null, "minPrice": null, "maxPrice": null },
    "sort": { "by": "createdAt", "order": "asc" }
  },
  "data": [ /* ... */ ],
  "requestId": "19b08264",
  "timestamp": "2026-08-24T12:59:29.918Z"
}
```

**Thất bại**

```jsonc
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Lỗi: Sai hoặc thiếu API Key!", "details": { /* ... */ } },
  "requestId": "ba9d18e7",
  "timestamp": "2026-08-24T12:59:33.114Z"
}
```

`requestId` xuất hiện cả trong log terminal lẫn response — người dùng báo lỗi
chỉ cần đưa mã này là tra được đúng dòng log.

**Mã lỗi đang dùng:** `200` `201` · `400` sai dữ liệu · `401` sai API key ·
`404` không tìm thấy · `409` trùng tên game · `500` lỗi máy chủ.

---

## 🗂 Cấu trúc thư mục

```
E:\Nodejs
├── data/
│   └── data.json                  kho dữ liệu, tự sinh kèm 8 game mẫu
├── public/
│   ├── index.html                 Game Vault — giao diện cửa hàng cho người dùng
│   ├── console.html               API Console — công cụ thử endpoint
│   └── covers/                    ảnh bìa game (phục vụ tĩnh qua express.static)
├── src/
│   ├── server.js                  điểm khởi động, banner, tắt server êm ái
│   ├── app.js                     lắp ráp middleware pipeline
│   ├── config/index.js            cấu hình tập trung, đọc từ biến môi trường
│   ├── middlewares/
│   │   ├── requestId.middleware.js      mã truy vết cho mỗi request
│   │   ├── logger.middleware.js         ★ YÊU CẦU 3.1
│   │   ├── apiKey.middleware.js         ★ YÊU CẦU 3.2
│   │   ├── validate.middleware.js       ★ YÊU CẦU 3.3
│   │   ├── notFound.middleware.js       404 kèm gợi ý endpoint
│   │   └── errorHandler.middleware.js   xử lý lỗi tập trung
│   ├── routes/                    khai báo đường dẫn + gắn middleware
│   ├── controllers/               nhận request, trả response
│   ├── services/                  nghiệp vụ: lọc, tìm, sắp xếp, phân trang
│   ├── repositories/              đọc/ghi data.json (ghi nguyên tử + khoá)
│   └── utils/                     ApiError · ApiResponse · asyncHandler · logger
├── tests/api.test.js              29 test tự động
├── requests.http                  bộ request mẫu cho VS Code REST Client
└── .env.example
```

**Vì sao tách 4 tầng?** Mỗi tầng chỉ biết tầng ngay dưới nó. Muốn đổi
`data.json` sang MongoDB chỉ cần viết lại `repositories/` — controller,
service, middleware giữ nguyên không sửa một dòng.

---

## 🛡 Những chỗ được xử lý kỹ

| Vấn đề | Cách xử lý |
|---|---|
| Hai request POST bắn cùng lúc ghi đè nhau | Hàng đợi khoá tuần tự trong repository — có test 10 request song song |
| Server tắt giữa lúc ghi làm hỏng `data.json` | Ghi ra file `.tmp` rồi `rename` (thao tác nguyên tử của hệ điều hành) |
| `data.json` chưa tồn tại | Tự tạo kèm 8 game mẫu ngay lúc khởi động |
| `data.json` sai cú pháp JSON | Báo lỗi rõ ràng lúc khởi động thay vì lỗi khó hiểu ở request đầu tiên |
| JSON body của client sai cú pháp | `400` với thông báo dễ hiểu, server không sập |
| Lỗi async không ai bắt | `asyncHandler` đẩy mọi Promise rejection về `errorHandler` |
| Rò rỉ stack trace cho người dùng | Chỉ hiện stack ở môi trường `development` |
| Trùng tên game | `409 Conflict` thay vì âm thầm tạo bản ghi trùng |
| `Ctrl + C` khi đang có request dở | `SIGINT`/`SIGTERM` → đóng server êm ái, xử lý nốt request đang chạy |
| `/api/games/stats` bị hiểu nhầm là `:id` | Đăng ký route `/stats` trước route `/:id` |

---

## 🧪 Kiểm chứng bằng test

```bash
npm test
```

29 test, bám sát từng gạch đầu dòng của đề bài:

```
✔ YC1 · GET /api/games trả về danh sách game
✔ YC1 · GET /api/games/:id trả về đúng game
✔ YC1 · GET /api/games/:id với id không tồn tại trả 404
✔ YC1 · POST /api/games tạo game mới
✔ YC1 · PUT /api/games/:id cập nhật game
✔ YC1 · DELETE /api/games/:id xoá game
✔ YC2 · GET /api/games?genre=RPG chỉ trả game RPG
✔ YC2 · không truyền genre thì trả về toàn bộ
✔ YC2 · lọc genre không phân biệt hoa thường
✔ YC2 · genre không tồn tại trả về mảng rỗng, không phải lỗi
✔ YC3 · POST thiếu x-api-key bị chặn 401
✔ YC3 · POST với x-api-key sai bị chặn 401
✔ YC3 · PUT và DELETE cũng bị API Key Guard chặn
✔ YC3 · GET không cần API key
✔ YC3 · title rỗng bị 400
✔ YC3 · genre không phải chuỗi bị 400
✔ YC3 · price không phải số bị 400
✔ YC3 · price <= 0 bị 400
✔ YC3 · validator gom tất cả lỗi trong một lần trả về
✔ YC3 · dữ liệu sai thì KHÔNG được ghi vào file
✔ YC3 · PUT cũng chạy qua validator
✔ YC3 · API Key được kiểm tra TRƯỚC validator
✔ EXT · trùng tên game bị từ chối với 409
✔ EXT · phân trang trả đúng meta
✔ EXT · sắp xếp theo giá giảm dần
✔ EXT · JSON body sai cú pháp trả 400 chứ không sập server
✔ EXT · route không tồn tại trả 404 kèm gợi ý
✔ EXT · mọi response đều có requestId để truy vết
✔ EXT · POST song song không làm mất dữ liệu (kiểm tra khoá ghi)

# pass 29   # fail 0
```

Bộ test chạy trên file dữ liệu tạm nên **không đụng vào `data.json` thật**.

---

## 💻 Thử nhanh bằng cURL

```bash
# Lấy danh sách
curl http://localhost:3000/api/games

# Lọc theo thể loại  (★ Yêu cầu 2)
curl "http://localhost:3000/api/games?genre=RPG"

# Thêm game — có API key
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-key" \
  -d '{"title":"Cyberpunk 2077","genre":"RPG","price":690000}'

# Thiếu API key  ->  401  (★ Yêu cầu 3.2)
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"title":"Game lậu","genre":"RPG","price":100000}'

# Dữ liệu sai  ->  400  (★ Yêu cầu 3.3)
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-key" \
  -d '{"title":"","genre":999,"price":-1}'
```

---

## ☁️ Triển khai lên Vercel

Dự án chạy được trên Vercel mà **không cần sửa một dòng logic nào** — chỉ thêm
lớp vỏ cho môi trường serverless:

| File | Vai trò |
|---|---|
| [api/index.js](api/index.js) | Điểm vào cho Vercel: xuất thẳng Express app, **không** gọi `app.listen()` |
| [vercel.json](vercel.json) | Đẩy mọi đường dẫn vào hàm đó, kèm `includeFiles` để đóng gói `public/` |

`src/server.js` (có `app.listen`) vẫn dùng khi chạy ở máy. Cả hai đều gọi
chung `createApp()` nên middleware pipeline **giống hệt nhau** ở hai môi trường.

### Hai điểm cần biết khi chạy trên Vercel

**1. Dữ liệu không lưu vĩnh viễn.** Serverless có thư mục mã nguồn ở chế độ
chỉ đọc, chỉ `/tmp` mới ghi được — mà `/tmp` sẽ bị xoá khi hàm nguội đi.
Code tự nhận biết môi trường và chuyển kho dữ liệu sang đó:

```js
// src/config/index.js
export const isServerless = Boolean(process.env.VERCEL);

const resolveDataFile = () => {
  if (process.env.DATA_FILE) return path.resolve(process.env.DATA_FILE);
  if (isServerless) return path.join('/tmp', 'data.json');   // nơi duy nhất ghi được
  return path.join(ROOT_DIR, 'data', 'data.json');
};
```

Nhờ repository vốn đã tự sinh dữ liệu mẫu khi không thấy file, mỗi lần chạy
nguội API lại có đủ 8 game — **toàn bộ CRUD vẫn hoạt động**, chỉ là game bạn
thêm vào sẽ mất sau một thời gian không ai truy cập. Muốn lưu vĩnh viễn thì
phải thay `repositories/` bằng một database thật (Vercel Postgres, MongoDB
Atlas…) — đúng như thiết kế phân tầng đã tính trước, các tầng khác không phải sửa.

**2. Deployment Protection.** Vercel mặc định bật SSO cho project cá nhân,
mọi request lạ bị chuyển hướng về trang đăng nhập. Muốn gửi link cho người
khác xem, vào **Project Settings → Deployment Protection → tắt Vercel Authentication**.

---

## ⚙️ Biến môi trường

Copy `.env.example` thành `.env` (hoặc truyền trực tiếp khi chạy lệnh):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng server |
| `NODE_ENV` | `development` | `production` sẽ ẩn stack trace khỏi response |
| `API_KEY` | `super-secret-key` | Khoá cho POST/PUT/DELETE |
| `DATA_FILE` | `data/data.json` | Đường dẫn kho dữ liệu (test dùng file tạm) |

---

## 📖 Ghi chú kỹ thuật

- **ESM thuần** (`"type": "module"`) — dùng `import/export`, không `require`.
- **Zero dependency ngoài Express** — logger màu, validator, test runner đều
  tự viết hoặc dùng module có sẵn của Node (`node:test`, `node:crypto`).
- Yêu cầu **Node.js ≥ 18**.
