// ============================================================
// TIMXEDIEN — NẠP DỮ LIỆU THẬT TỪ ADMIN (CONFIG/FLEET/FAQS/REVIEWS)
// Trang luôn hiện dữ liệu tĩnh trong js/data.js trước tiên (nhanh, không
// phụ thuộc mạng) — nếu gọi API thành công thì âm thầm cập nhật lại nội
// dung mới nhất mà admin đã sửa, không chặn hay làm chậm lần hiện đầu tiên.
// Gọi API thất bại (mạng chậm, chưa cấu hình DB...) thì bỏ qua, trang vẫn
// chạy đúng với dữ liệu tĩnh có sẵn.
// ============================================================

(function () {
  "use strict";

  async function fetchJson(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  async function loadLive() {
    const [cfg, fleet, faqs, reviews] = await Promise.all([
      fetchJson("/api/content?type=config"),
      fetchJson("/api/fleet"),
      fetchJson("/api/content?type=faqs"),
      fetchJson("/api/content?type=reviews")
    ]);

    let changed = false;

    if (cfg && cfg.ok && cfg.config && typeof CONFIG !== "undefined") {
      Object.keys(cfg.config).forEach((k) => { if (cfg.config[k]) CONFIG[k] = cfg.config[k]; });
      changed = true;
    }
    if (fleet && fleet.ok && Array.isArray(fleet.cars) && fleet.cars.length && typeof FLEET !== "undefined") {
      FLEET.length = 0;
      fleet.cars.forEach((c) => FLEET.push(c));
      changed = true;
    }
    if (faqs && faqs.ok && Array.isArray(faqs.faqs) && faqs.faqs.length && typeof FAQS !== "undefined") {
      FAQS.length = 0;
      faqs.faqs.forEach((f) => FAQS.push(f));
      changed = true;
    }
    if (reviews && reviews.ok && Array.isArray(reviews.reviews) && reviews.reviews.length && typeof REVIEWS !== "undefined") {
      REVIEWS.length = 0;
      reviews.reviews.forEach((r) => REVIEWS.push(r));
      changed = true;
    }

    if (changed) document.dispatchEvent(new Event("txd:live-data-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadLive);
  } else {
    loadLive();
  }
})();
