// ============================================================
// TIMXEDIEN.COM — CHỨC NĂNG WEBSITE
// Phụ thuộc js/data.js (CONFIG, FLEET, PICKUP_POINTS, REVIEWS, FAQS)
// ============================================================

(function () {
  "use strict";

  // ---------- Tiện ích ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Math.round(n).toLocaleString("vi-VN") + "đ";
  const todayStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  };
  const validPhone = (p) => /^(\+84|0)\d{9,10}$/.test(String(p || "").replace(/[\s.\-]/g, ""));

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
  }

  // ---------- Áp dụng CONFIG cho các liên kết liên hệ ----------
  (function applyConfig() {
    const tel = "tel:" + CONFIG.hotline;
    $$("[data-cfg^=telLink]").forEach((a) => { a.href = tel; a.textContent = a.textContent.replace(/[\d.]{10,}/, CONFIG.hotlineDisplay); });
    $$("[data-cfg^=zaloLink]").forEach((a) => { if (a.tagName === "A") a.href = CONFIG.zalo; });
    $$("[data-cfg^=emailLink]").forEach((a) => { a.href = "mailto:" + CONFIG.email; a.textContent = CONFIG.email; });
    const fb = $("[data-cfg=fbLink]"); if (fb) fb.href = CONFIG.facebook;
    const tt = $("[data-cfg=ttLink]"); if (tt) tt.href = CONFIG.tiktok;
    const ad = $("[data-cfg=address]"); if (ad) ad.textContent = CONFIG.address;
    $("#scZalo").href = CONFIG.zalo;
    $("#scCall").href = tel;
  })();

  // ---------- Menu di động ----------
  const menu = $("#menu");
  $("#navToggle").addEventListener("click", () => menu.classList.toggle("open"));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));

  // ---------- Modal chung ----------
  function openModal(id) {
    $(id).classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeModal(el) {
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

  // ---------- Trạng thái đặt xe (được hộp tìm nhanh truyền vào) ----------
  const prefill = { mode: "day", from: todayStr(1), to: todayStr(2), months: "1", pickup: "vp" };

  // ---------- Hộp đặt xe nhanh (hero) ----------
  (function initQuickbook() {
    const pickup = $("#qbPickup");
    PICKUP_POINTS.forEach((p) => pickup.add(new Option(p.label, p.id)));
    $("#qbFrom").value = prefill.from;
    $("#qbTo").value = prefill.to;
    $("#qbFrom").min = todayStr(0);
    $("#qbTo").min = todayStr(0);

    $$("#qbTabs button").forEach((b) =>
      b.addEventListener("click", () => {
        $$("#qbTabs button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        prefill.mode = b.dataset.mode;
        $("#qbDayFields").style.display = prefill.mode === "day" ? "" : "none";
        $("#qbMonthFields").style.display = prefill.mode === "month" ? "" : "none";
        setPriceUnit(prefill.mode);
      })
    );

    $("#qbSearch").addEventListener("click", () => {
      prefill.pickup = pickup.value;
      prefill.from = $("#qbFrom").value || todayStr(1);
      prefill.to = $("#qbTo").value || todayStr(2);
      prefill.months = $("#qbMonths").value;
      document.getElementById("doi-xe").scrollIntoView({ behavior: "smooth" });
      if (prefill.mode === "day") {
        const d = countDays(prefill.from, prefill.to);
        toast(`Đã tính giá cho ${d} ngày thuê — chọn xe bên dưới và bấm "Đặt xe" 👇`);
      } else {
        toast(`Đã chọn thuê ${prefill.months} tháng — chọn xe bên dưới và bấm "Đặt xe" 👇`);
      }
    });
  })();

  // ---------- Đội xe ----------
  let currentSeg = "all";
  let priceUnit = "day";

  function carCard(car) {
    const price = priceUnit === "day" ? car.priceDay : car.priceMonth;
    const unit = priceUnit === "day" ? "/ngày" : "/tháng";
    return `
    <article class="car-card reveal visible" data-seg="${car.segment}">
      <div class="car-media">
        ${car.tag ? `<span class="car-tag">${car.tag}</span>` : ""}
        <img src="${car.img}" alt="Thuê ${car.name} tại Cần Thơ" loading="lazy">
      </div>
      <div class="car-body">
        <h3>${car.name}</h3>
        <div class="car-seg">${car.segmentLabel} · ${car.seats} chỗ</div>
        <div class="car-specs">
          <span>🔋 ${car.range}</span>
          <span>🛣️ ${priceUnit === "day" ? CONFIG.kmPerDay + " km/ngày" : CONFIG.kmPerMonth.toLocaleString("vi-VN") + " km/tháng"}</span>
        </div>
        <div class="car-price"><b>${fmt(price)}</b> <small>${unit}</small></div>
        <div class="car-actions">
          <button class="btn btn-outline btn-sm" data-detail="${car.id}">Chi tiết</button>
          <button class="btn btn-primary btn-sm" data-book="${car.id}">Đặt xe</button>
        </div>
      </div>
    </article>`;
  }

  function renderFleet() {
    const list = FLEET.filter((c) => currentSeg === "all" || c.segment === currentSeg);
    $("#fleetGrid").innerHTML = list.map(carCard).join("");
    $$("#fleetGrid [data-book]").forEach((b) => b.addEventListener("click", () => openBooking(b.dataset.book)));
    $$("#fleetGrid [data-detail]").forEach((b) => b.addEventListener("click", () => openDetail(b.dataset.detail)));
  }

  $$("#fleetFilters button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#fleetFilters button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      currentSeg = b.dataset.seg;
      renderFleet();
    })
  );

  function setPriceUnit(unit) {
    priceUnit = unit;
    $$("#priceToggle button").forEach((x) => x.classList.toggle("active", x.dataset.unit === unit));
    renderFleet();
  }
  $$("#priceToggle button").forEach((b) => b.addEventListener("click", () => setPriceUnit(b.dataset.unit)));

  // ---------- Chi tiết xe ----------
  function openDetail(id) {
    const car = FLEET.find((c) => c.id === id);
    if (!car) return;
    $("#dtName").textContent = car.name;
    $("#dtSeg").textContent = `${car.segmentLabel} · ${car.seats} chỗ · ${car.range}`;
    $("#dtBody").innerHTML = `
      <div class="detail-media">
        <img src="${car.img}" alt="${car.name}">
      </div>
      <p style="font-size:14.5px;color:var(--mut)">${car.desc}</p>
      <div class="spec-grid">
        <div><span>Giá thuê ngày</span><b>${fmt(car.priceDay)}/ngày</b></div>
        <div><span>Giá thuê tháng</span><b>${fmt(car.priceMonth)}/tháng</b></div>
        <div><span>Giới hạn quãng đường</span><b>${CONFIG.kmPerDay} km/ngày · ${CONFIG.kmPerMonth.toLocaleString("vi-VN")} km/tháng</b></div>
        <div><span>Phụ phí vượt km</span><b>${car.overKm.toLocaleString("vi-VN")}đ/km</b></div>
      </div>
      <ul style="margin:4px 0 18px">
        ${car.features.map((f) => `<li style="padding:4px 0 4px 26px;position:relative;font-size:14px"><span style="position:absolute;left:2px;color:var(--green);font-weight:800">✓</span>${f}</li>`).join("")}
      </ul>
      <button class="btn btn-primary btn-block" data-bookdetail="${car.id}">Đặt ${car.name} ngay</button>`;
    $("#dtBody [data-bookdetail]").addEventListener("click", () => {
      closeModal($("#detailModal"));
      openBooking(car.id);
    });
    openModal("#detailModal");
  }

  // ---------- Đặt xe ----------
  const bmCar = $("#bmCar");
  FLEET.forEach((c) => bmCar.add(new Option(`${c.name} — ${fmt(c.priceDay)}/ngày`, c.id)));
  const bmPickup = $("#bmPickup");
  PICKUP_POINTS.forEach((p) => bmPickup.add(new Option(p.label, p.id)));

  let bmMode = "day";

  function openBooking(carId) {
    if (carId) bmCar.value = carId;
    bmMode = prefill.mode;
    $$("#bmTabs button").forEach((x) => x.classList.toggle("active", x.dataset.mode === bmMode));
    $("#bmDayFields").style.display = bmMode === "day" ? "" : "none";
    $("#bmMonthFields").style.display = bmMode === "month" ? "" : "none";
    $("#bmFrom").value = prefill.from;
    $("#bmTo").value = prefill.to;
    $("#bmFrom").min = todayStr(0);
    $("#bmTo").min = todayStr(0);
    $("#bmMonths").value = ["1", "2", "3", "6", "12", "24"].includes(prefill.months) ? prefill.months : "1";
    bmPickup.value = prefill.pickup;
    updateBookingUI();
    openModal("#bookingModal");
  }

  $$("#bmTabs button").forEach((b) =>
    b.addEventListener("click", () => {
      bmMode = b.dataset.mode;
      $$("#bmTabs button").forEach((x) => x.classList.toggle("active", x === b));
      $("#bmDayFields").style.display = bmMode === "day" ? "" : "none";
      $("#bmMonthFields").style.display = bmMode === "month" ? "" : "none";
      updateBookingUI();
    })
  );
  ["bmCar", "bmFrom", "bmTo", "bmMonths", "bmPickup"].forEach((id) =>
    $("#" + id).addEventListener("change", updateBookingUI)
  );

  function countDays(from, to) {
    const a = new Date(from), b = new Date(to);
    const d = Math.ceil((b - a) / 86400000);
    return Math.max(1, d || 1);
  }

  // Tính giá — trả về chi tiết để hiển thị & lưu đơn
  function quote() {
    const car = FLEET.find((c) => c.id === bmCar.value) || FLEET[0];
    const point = PICKUP_POINTS.find((p) => p.id === bmPickup.value) || PICKUP_POINTS[0];
    let qty, unitPrice, unitLabel, discountRate = 0, note = "";

    if (bmMode === "day") {
      qty = countDays($("#bmFrom").value || todayStr(1), $("#bmTo").value || todayStr(2));
      unitPrice = car.priceDay;
      unitLabel = "ngày";
      if (qty >= 30) note = "💡 Thuê từ 30 ngày — chuyển sang \"Thuê theo tháng\" sẽ tiết kiệm hơn nhiều!";
      if (qty >= 7) discountRate = CONFIG.discount7Day;
      else if (qty >= 3) discountRate = CONFIG.discount3Day;
    } else {
      qty = parseInt($("#bmMonths").value, 10) || 1;
      unitPrice = car.priceMonth;
      unitLabel = "tháng";
      if (qty >= 12) discountRate = CONFIG.discount12Month;
      else if (qty >= 6) discountRate = CONFIG.discount6Month;
    }

    const sub = unitPrice * qty;
    const discount = sub * discountRate;
    const total = sub - discount + point.fee;
    return { car, point, qty, unitPrice, unitLabel, sub, discountRate, discount, total, note };
  }

  function updateBookingUI() {
    const q = quote();
    $("#bmCarMini").innerHTML = `
      <img src="${q.car.img}" alt="${q.car.name}">
      <div><b>${q.car.name}</b><span>${q.car.segmentLabel} · ${q.car.seats} chỗ · 🔋 ${q.car.range}</span></div>`;
    $("#bmSummary").innerHTML = `
      <div class="row"><span>Đơn giá thuê</span><span>${fmt(q.unitPrice)} × ${q.qty} ${q.unitLabel}</span></div>
      ${q.discountRate ? `<div class="row"><span>Ưu đãi thuê dài</span><span class="off">−${Math.round(q.discountRate * 100)}% (−${fmt(q.discount)})</span></div>` : ""}
      ${q.point.fee ? `<div class="row"><span>Phí giao xe tận nơi</span><span>${fmt(q.point.fee)}</span></div>` : ""}
      <div class="row total"><span>Tạm tính</span><b>${fmt(q.total)}</b></div>
      <div class="note">Cọc giữ chỗ ${fmt(CONFIG.deposit)} (trừ vào tiền thuê) · Giới hạn ${bmMode === "day" ? CONFIG.kmPerDay + " km/ngày" : CONFIG.kmPerMonth.toLocaleString("vi-VN") + " km/tháng"} · Vượt km: ${q.car.overKm.toLocaleString("vi-VN")}đ/km${q.note ? "<br>" + q.note : ""}</div>`;
  }

  // ---- Kiểm tra & gửi đơn ----
  function setInvalid(id, bad) {
    $("#" + id).closest(".field").classList.toggle("invalid", !!bad);
    return !bad;
  }

  function saveLocalBooking(order) {
    try {
      const arr = JSON.parse(localStorage.getItem("txd_bookings") || "[]");
      arr.unshift(order);
      localStorage.setItem("txd_bookings", JSON.stringify(arr.slice(0, 50)));
    } catch (e) { /* bỏ qua nếu trình duyệt chặn */ }
  }

  async function sendLead(payload) {
    // Gửi về API (khi deploy Vercel). Chạy file tĩnh/local → tự chuyển chế độ offline.
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error("api");
      return true;
    } catch (e) {
      return false;
    }
  }

  async function sendOrder(order) {
    // Đơn thuê xe → API orders (kèm token nếu khách đã đăng nhập)
    try {
      const headers = window.TXDAuth ? TXDAuth.header() : { "Content-Type": "application/json" };
      const r = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(order)
      });
      if (!r.ok) throw new Error("api");
      return true;
    } catch (e) {
      return false;
    }
  }

  $("#bookingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#bmName").value.trim();
    const phone = $("#bmPhone").value.trim();
    let ok = setInvalid("bmName", !name);
    ok = setInvalid("bmPhone", !validPhone(phone)) && ok;
    if (bmMode === "day") {
      const from = $("#bmFrom").value, to = $("#bmTo").value;
      ok = setInvalid("bmFrom", !from || from < todayStr(0)) && ok;
      ok = setInvalid("bmTo", !to || to < from) && ok;
    }
    if (!ok) return;

    const q = quote();
    const code = "TXD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const time = bmMode === "day"
      ? `${$("#bmFrom").value} → ${$("#bmTo").value} (${q.qty} ngày)`
      : `${q.qty} tháng`;

    const order = {
      code, name, phone,
      car: q.car.name, carId: q.car.id, mode: bmMode, time,
      pickup: q.point.label, total: q.total,
      note: $("#bmNote").value.trim(),
      status: "new",
      createdAt: new Date().toISOString()
    };

    const btn = $("#bmSubmit");
    btn.disabled = true;
    btn.textContent = "Đang gửi đơn...";
    const sent = await sendOrder(order);
    btn.disabled = false;
    btn.textContent = "Xác nhận đặt xe";

    saveLocalBooking(order);
    closeModal($("#bookingModal"));
    $("#scTitle").textContent = "Đặt xe thành công!";
    $("#scCode").textContent = code;
    $("#scMeta").innerHTML = `<b>${q.car.name}</b> · ${time}<br>${q.point.label}<br>Tạm tính: <b style="color:var(--green-d)">${fmt(q.total)}</b>`;
    $("#scDesc").textContent = sent
      ? "Chúng tôi đã nhận được đơn và sẽ gọi xác nhận trong 15 phút. Lưu lại mã đặt xe của bạn:"
      : "Đơn đã được lưu. Vui lòng bấm nút Zalo hoặc gọi hotline bên dưới kèm mã đơn để được xác nhận nhanh nhất:";
    // Đã đăng nhập thì khỏi gợi ý tạo tài khoản
    const scAcc = $("#scAccount");
    if (scAcc) scAcc.style.display = window.TXDAuth && TXDAuth.user() ? "none" : "";
    openModal("#successModal");
    e.target.reset();
  });

  // ---------- Form tư vấn ----------
  $("#consultForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#cfName").value.trim();
    const phone = $("#cfPhone").value.trim();
    let ok = setInvalid("cfName", !name);
    ok = setInvalid("cfPhone", !validPhone(phone)) && ok;
    if (!ok) return;

    const btn = $("#consultForm button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Đang gửi...";
    const sent = await sendLead({
      name, phone,
      topic: $("#cfTopic").value,
      message: $("#cfMsg").value.trim(),
      source: "timxedien-consult"
    });
    btn.disabled = false;
    btn.textContent = "Gửi đăng ký tư vấn";

    if (sent) {
      toast("✅ Đã nhận đăng ký! Chúng tôi sẽ gọi lại cho bạn trong 15 phút.");
      e.target.reset();
    } else {
      toast("📞 Hệ thống đang bận — vui lòng gọi " + CONFIG.hotlineDisplay + " hoặc nhắn Zalo để được tư vấn ngay!");
      window.open(CONFIG.zalo, "_blank");
    }
  });

  // Nút có data-topic (VD "Nhận tư vấn gói dài hạn") → tự chọn chủ đề trong form
  $$("[data-topic]").forEach((a) =>
    a.addEventListener("click", () => {
      const opt = Array.from($("#cfTopic").options).find((o) => o.text.includes(a.dataset.topic));
      if (opt) $("#cfTopic").value = opt.value;
    })
  );

  // ---------- Đánh giá ----------
  let revIdx = 0, revTimer;
  function renderReviews() {
    $("#reviewsBox").innerHTML = REVIEWS.map((r, i) => `
      <div class="review ${i === revIdx ? "active" : ""}">
        <div class="stars">${"★".repeat(r.stars)}</div>
        <p class="text">“${r.text}”</p>
        <div class="who"><b>${r.name}</b><span>${r.role}</span></div>
      </div>`).join("");
    $("#revDots").innerHTML = REVIEWS.map((_, i) =>
      `<button class="${i === revIdx ? "active" : ""}" data-i="${i}" aria-label="Đánh giá ${i + 1}"></button>`).join("");
    $$("#revDots button").forEach((b) => b.addEventListener("click", () => showReview(+b.dataset.i)));
  }
  function showReview(i) {
    revIdx = (i + REVIEWS.length) % REVIEWS.length;
    renderReviews();
    restartRevTimer();
  }
  function restartRevTimer() {
    clearInterval(revTimer);
    revTimer = setInterval(() => showReview(revIdx + 1), 6000);
  }
  $("#revPrev").addEventListener("click", () => showReview(revIdx - 1));
  $("#revNext").addEventListener("click", () => showReview(revIdx + 1));
  renderReviews();
  restartRevTimer();

  // ---------- FAQ ----------
  $("#faqList").innerHTML = FAQS.map((f, i) => `
    <div class="faq reveal">
      <button class="q" type="button" aria-expanded="false">
        <span>${f.q}</span><span class="chev">▾</span>
      </button>
      <div class="a"><p>${f.a}</p></div>
    </div>`).join("");
  $$(".faq .q").forEach((btn) =>
    btn.addEventListener("click", () => {
      const faq = btn.closest(".faq");
      const open = faq.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      const a = $(".a", faq);
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0";
    })
  );

  // ---------- Tra cứu đơn ----------
  function openLookup(e) {
    if (e) e.preventDefault();
    $("#lkResult").innerHTML = "";
    $("#lkQuery").value = "";
    openModal("#lookupModal");
  }
  $("#lookupLinkFoot").addEventListener("click", openLookup);
  $("#lkBtn").addEventListener("click", () => {
    const qr = $("#lkQuery").value.trim().toUpperCase();
    if (!qr) return;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem("txd_bookings") || "[]"); } catch (e) {}
    const digits = qr.replace(/\D/g, "");
    const found = arr.filter((o) =>
      o.code.toUpperCase() === qr ||
      (digits.length >= 9 && String(o.phone).replace(/\D/g, "").includes(digits)));
    $("#lkResult").innerHTML = found.length
      ? found.map((o) => `
        <div class="lookup-item">
          <span class="st">${(ORDER_STATUS[o.status] || { label: o.status }).label}</span>
          <b>${o.code}</b> — ${o.car}<br>
          <span style="color:var(--mut);font-size:13px">${o.time} · ${o.pickup} · Tạm tính ${fmt(o.total)}</span>
        </div>`).join("")
      : `<div class="lookup-item">Không tìm thấy đơn trên thiết bị này. Vui lòng gọi <a href="tel:${CONFIG.hotline}" style="color:var(--green-d);font-weight:700">${CONFIG.hotlineDisplay}</a> để được kiểm tra.</div>`;
  });

  // ---------- Máy tính tiết kiệm ----------
  const GAS_PRICE = 22000, GAS_L_PER_100KM = 7;
  function updateCalc() {
    const km = +$("#kmRange").value;
    $("#kmVal").textContent = km.toLocaleString("vi-VN") + " km";
    const gas = (km / 100) * GAS_L_PER_100KM * GAS_PRICE;
    $("#costGas").textContent = fmt(gas);
    $("#costSave").textContent = fmt(gas * 12);
  }
  $("#kmRange").addEventListener("input", updateCalc);
  updateCalc();

  // ---------- Hiệu ứng cuộn & nút lên đầu ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("visible"); });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  const toTop = $("#toTop");
  window.addEventListener("scroll", () => {
    toTop.classList.toggle("show", window.scrollY > 700);
  }, { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ---------- Khởi tạo ----------
  renderFleet();
})();
