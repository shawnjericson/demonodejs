/**
 * Bọc một handler async để mọi Promise bị reject đều tự động
 * rơi vào error-handling middleware, khỏi phải try/catch lặp đi lặp lại.
 *
 * @param {(req, res, next) => Promise<any>} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
