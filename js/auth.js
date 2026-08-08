// ============================================================
// TIMXEDIEN — QUẢN LÝ PHIÊN ĐĂNG NHẬP PHÍA KHÁCH (mọi trang)
// Token lưu localStorage; api/auth.js xác thực khi deploy Vercel.
// ============================================================

window.TXDAuth = (function () {
  "use strict";
  const KEY_TOKEN = "txd_token", KEY_USER = "txd_user";

  function token() { return localStorage.getItem(KEY_TOKEN) || ""; }
  function user() {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || "null"); }
    catch (e) { return null; }
  }
  function save(tk, u) {
    localStorage.setItem(KEY_TOKEN, tk);
    localStorage.setItem(KEY_USER, JSON.stringify(u));
    updateNav();
  }
  function logout() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
    updateNav();
  }
  // Header Authorization cho fetch
  function header(extra) {
    const h = Object.assign({ "Content-Type": "application/json" }, extra || {});
    if (token()) h["Authorization"] = "Bearer " + token();
    return h;
  }
  // Đổi chữ "Tài khoản" trên menu thành tên khách khi đã đăng nhập
  function updateNav() {
    const u = user();
    document.querySelectorAll(".nav-account").forEach((a) => {
      const label = a.querySelector(".acct-label") || a;
      if (u && u.name) {
        const first = u.name.trim().split(/\s+/).pop();
        label.textContent = label === a ? "👤 " + first : " " + first;
        a.title = "Tài khoản của " + u.name;
      } else {
        label.textContent = label === a ? "👤 Tài khoản" : " Tài khoản";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", updateNav);
  return { token, user, save, logout, header, updateNav };
})();
