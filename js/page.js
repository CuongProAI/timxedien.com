// ============================================================
// TIMXEDIEN — KHUNG DÙNG CHUNG CHO CÁC TRANG CON
// (xe-cu.html, phu-kien.html, tai-khoan.html)
// Trang chủ dùng js/app.js riêng, KHÔNG nạp file này cùng app.js.
// ============================================================

window.TXDPage = (function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(n).toLocaleString("vi-VN") + "đ";
  const validPhone = (p) => /^(\+84|0)\d{9,10}$/.test(String(p || "").replace(/[\s.\-]/g, ""));

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  // ---------- Menu di động ----------
  const menu = $("#menu");
  const navToggle = $("#navToggle");
  if (navToggle && menu) {
    navToggle.addEventListener("click", () => menu.classList.toggle("open"));
    $$("#menu a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  // ---------- Modal ----------
  function openModal(id) {
    const el = typeof id === "string" ? $(id) : id;
    if (!el) return;
    el.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeModal(el) {
    if (typeof el === "string") el = $(el);
    if (!el) return;
    el.classList.remove("show");
    document.body.style.overflow = "";
  }
  $$(".modal-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => { if (e.target === bd) closeModal(bd); });
    $$("[data-close]", bd).forEach((b) => b.addEventListener("click", () => closeModal(bd)));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal-backdrop.show").forEach(closeModal);
  });

  // ---------- Liên kết liên hệ theo CONFIG ----------
  (function applyConfig() {
    const tel = "tel:" + CONFIG.hotline;
    $$("[data-cfg^=telLink]").forEach((a) => { a.href = tel; a.textContent = a.textContent.replace(/[\d.]{10,}/, CONFIG.hotlineDisplay); });
    $$("[data-cfg^=zaloLink]").forEach((a) => { if (a.tagName === "A") a.href = CONFIG.zalo; });
    $$("[data-cfg^=emailLink]").forEach((a) => { a.href = "mailto:" + CONFIG.email; a.textContent = CONFIG.email; });
  })();

  // ---------- Gửi lead tư vấn (fallback Zalo khi chạy local) ----------
  async function sendLead(payload) {
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: TXDAuth.header(),
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error("api");
      return true;
    } catch (e) { return false; }
  }

  // ---------- Modal tư vấn dùng chung (nếu trang có #consultModal) ----------
  function openConsult(topic, hint) {
    const md = $("#consultModal");
    if (!md) return;
    $("#cmTopic").value = topic || "";
    $("#cmHint").textContent = hint || "";
    $("#cmHint").style.display = hint ? "" : "none";
    openModal(md);
  }

  const cmForm = $("#consultModalForm");
  if (cmForm) {
    cmForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#cmName").value.trim();
      const phone = $("#cmPhone").value.trim();
      const bad = (id, is) => { $("#" + id).closest(".field").classList.toggle("invalid", !!is); return !is; };
      let ok = bad("cmName", !name);
      ok = bad("cmPhone", !validPhone(phone)) && ok;
      if (!ok) return;

      const btn = $("#cmSubmit");
      btn.disabled = true; btn.textContent = "Đang gửi...";
      const sent = await sendLead({
        name, phone,
        topic: $("#cmTopic").value,
        message: $("#cmMsg").value.trim(),
        source: "timxedien-" + (document.body.dataset.page || "page")
      });
      btn.disabled = false; btn.textContent = "Gửi yêu cầu tư vấn";

      closeModal($("#consultModal"));
      if (sent) {
        toast("✅ Đã nhận yêu cầu! Chúng tôi sẽ gọi lại trong 15 phút.");
        cmForm.reset();
      } else {
        toast("📞 Hệ thống bận — đang mở Zalo, bạn nhắn trực tiếp giúp nhé!");
        window.open(CONFIG.zalo, "_blank");
      }
    });
  }

  // ---------- Hiệu ứng cuộn + nút lên đầu ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("visible"); });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  const toTop = $("#toTop");
  if (toTop) {
    window.addEventListener("scroll", () => toTop.classList.toggle("show", window.scrollY > 700), { passive: true });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  return { $, $$, fmt, toast, validPhone, openModal, closeModal, sendLead, openConsult, observeReveal: (el) => io.observe(el) };
})();
