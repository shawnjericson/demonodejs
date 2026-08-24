import { createApp } from '../src/app.js';

/**
 * Điểm vào cho Vercel (serverless).
 *
 * Khác biệt duy nhất so với chạy ở máy: KHÔNG gọi app.listen().
 * Trên Vercel không có tiến trình server chạy nền — mỗi request được nền tảng
 * đưa thẳng vào hàm handler này. Một Express app vốn đã là hàm (req, res)
 * nên xuất thẳng ra là dùng được.
 *
 * Chạy ở máy vẫn dùng `npm start` -> src/server.js (có app.listen).
 * Cả hai đều dùng chung createApp() nên middleware pipeline giống hệt nhau.
 */
export default createApp();
