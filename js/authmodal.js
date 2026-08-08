// ============================================================
// TIMXEDIEN — POPUP ĐĂNG NHẬP / ĐĂNG KÝ (mọi trang)
// Bấm "Tài khoản" trên menu khi chưa đăng nhập sẽ mở popup này
// thay vì chuyển trang. Có nút "Tiếp tục với Google" (Google
// Identity Services) — chỉ hiện khi CONFIG.googleClientId có giá trị.
// ============================================================

(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const validPhone = (p) => /^(\+84|0)\d{9,10}$/.test(String(p || "").replace(/[\s.\-]/g, ""));

  function toast(msg) {
    if (window.TXDPage && TXDPage.toast) return TXDPage.toast(msg);
    alert(msg);
  }

  function openBackdrop(el) { el.classList.add("show"); document.body.style.overflow = "hidden"; }
  function closeBackdrop(el) { el.classList.remove("show"); document.body.style.overflow = ""; }

  const TPL = `
  <div class="modal-backdrop" id="authModal">
    <div class="modal" style="max-width:460px">
      <div class="modal-head">
        <div>
          <h3 id="amTitle">Đăng nhập / Đăng ký</h3>
          <div class="sub" id="amSub">Theo dõi đơn thuê xe, hồ sơ xác minh &amp; hợp đồng của bạn</div>
        </div>
        <button type="button" class="modal-close" data-close>&times;</button>
      </div>
      <div class="modal-body">
        <div id="amGoogleBox" style="display:none">
          <div id="amGoogleBtn"></div>
          <div class="at-divider"><span>hoặc dùng số điện thoại</span></div>
        </div>

        <div id="amPhoneStep" style="display:none">
          <p class="sub">Gần xong! Nhập số điện thoại để hoàn tất tài khoản (dùng để nhận đơn thuê &amp; liên hệ).</p>
          <div class="field">
            <label>Số điện thoại</label>
            <input type="tel" id="amGPhone" placeholder="VD: 0939 099 018" autocomplete="tel">
            <div class="err">Số điện thoại chưa đúng định dạng</div>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="amGPhoneBtn">Hoàn tất đăng nhập</button>
        </div>

        <div id="amForms">
          <div class="at-tabs">
            <button type="button" class="at-tab active" data-tab="login">Đăng nhập</button>
            <button type="button" class="at-tab" data-tab="register">Đăng ký</button>
          </div>
          <form id="amLoginForm" novalidate>
            <div class="field">
              <label>Số điện thoại</label>
              <input type="tel" id="amLgPhone" placeholder="VD: 0939 099 018" autocomplete="tel">
              <div class="err">Số điện thoại chưa đúng định dạng</div>
            </div>
            <div class="field">
              <label>Mật khẩu</label>
              <input type="password" id="amLgPass" placeholder="Tối thiểu 6 ký tự" autocomplete="current-password">
              <div class="err">Mật khẩu tối thiểu 6 ký tự</div>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="amLgBtn">Đăng nhập</button>
            <p class="sub" style="margin:12px 0 0;text-align:center">Quên mật khẩu? Gọi <a href="tel:0939099018" style="color:var(--green-d);font-weight:700">0939.099.018</a> để được cấp lại.</p>
          </form>
          <form id="amRegForm" novalidate style="display:none">
            <div class="field">
              <label>Họ và tên</label>
              <input type="text" id="amRgName" placeholder="VD: Nguyễn Văn An" autocomplete="name">
              <div class="err">Vui lòng nhập họ tên</div>
            </div>
            <div class="field">
              <label>Số điện thoại</label>
              <input type="tel" id="amRgPhone" placeholder="VD: 0939 099 018" autocomplete="tel">
              <div class="err">Số điện thoại chưa đúng định dạng</div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Mật khẩu</label>
                <input type="password" id="amRgPass" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password">
                <div class="err">Tối thiểu 6 ký tự</div>
              </div>
              <div class="field">
                <label>Nhập lại mật khẩu</label>
                <input type="password" id="amRgPass2" autocomplete="new-password">
                <div class="err">Chưa khớp mật khẩu</div>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="amRgBtn">Đăng ký tài khoản</button>
          </form>
        </div>
      </div>
    </div>
  </div>`;

  let modalEl = null;
  let googleIdToken = null;

  function ensureModal() {
    if (modalEl) return modalEl;
    const wrap = document.createElement("div");
    wrap.innerHTML = TPL.trim();
    modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);
    wireModal(modalEl);
    return modalEl;
  }

  function setTab(name) {
    modalEl.querySelectorAll(".at-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    $("#amLoginForm", modalEl).style.display = name === "login" ? "" : "none";
    $("#amRegForm", modalEl).style.display = name === "register" ? "" : "none";
  }

  function resetModal() {
    $("#amTitle", modalEl).textContent = "Đăng nhập / Đăng ký";
    $("#amSub", modalEl).textContent = "Theo dõi đơn thuê xe, hồ sơ xác minh & hợp đồng của bạn";
    $("#amPhoneStep", modalEl).style.display = "none";
    $("#amForms", modalEl).style.display = "";
    setTab("login");
    googleIdToken = null;
    modalEl.querySelectorAll("form").forEach((f) => {
      f.reset();
      f.querySelectorAll(".field").forEach((x) => x.classList.remove("invalid"));
    });
  }

  async function callAuth(payload) {
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error(d.error || "Có lỗi xảy ra, vui lòng thử lại.");
    return d;
  }

  function markInvalid(id, bad) {
    $("#" + id, modalEl).closest(".field").classList.toggle("invalid", !!bad);
    return !bad;
  }

  function wireModal(modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeBackdrop(modal); });
    modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeBackdrop(modal)));
    modal.querySelectorAll(".at-tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

    $("#amLoginForm", modal).addEventListener("submit", async (e) => {
      e.preventDefault();
      const phone = $("#amLgPhone", modal).value.trim();
      const pass = $("#amLgPass", modal).value;
      let ok = markInvalid("amLgPhone", !validPhone(phone));
      ok = markInvalid("amLgPass", pass.length < 6) && ok;
      if (!ok) return;
      const btn = $("#amLgBtn", modal);
      btn.disabled = true; btn.textContent = "Đang đăng nhập...";
      try {
        const d = await callAuth({ action: "login", phone, password: pass });
        TXDAuth.save(d.token, d.user);
        toast("✅ Đăng nhập thành công!");
        closeBackdrop(modal);
      } catch (err) { toast("⚠️ " + err.message); }
      finally { btn.disabled = false; btn.textContent = "Đăng nhập"; }
    });

    $("#amRegForm", modal).addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#amRgName", modal).value.trim();
      const phone = $("#amRgPhone", modal).value.trim();
      const p1 = $("#amRgPass", modal).value;
      const p2 = $("#amRgPass2", modal).value;
      let ok = markInvalid("amRgName", !name);
      ok = markInvalid("amRgPhone", !validPhone(phone)) && ok;
      ok = markInvalid("amRgPass", p1.length < 6) && ok;
      ok = markInvalid("amRgPass2", p1 !== p2) && ok;
      if (!ok) return;
      const btn = $("#amRgBtn", modal);
      btn.disabled = true; btn.textContent = "Đang đăng ký...";
      try {
        const d = await callAuth({ action: "register", name, phone, password: p1 });
        TXDAuth.save(d.token, d.user);
        toast("✅ Tạo tài khoản thành công!");
        closeBackdrop(modal);
      } catch (err) { toast("⚠️ " + err.message); }
      finally { btn.disabled = false; btn.textContent = "Đăng ký tài khoản"; }
    });

    $("#amGPhoneBtn", modal).addEventListener("click", async () => {
      const phone = $("#amGPhone", modal).value.trim();
      if (!markInvalid("amGPhone", !validPhone(phone))) return;
      if (!googleIdToken) { toast("⚠️ Phiên Google đã hết hạn, vui lòng thử lại."); resetModal(); return; }
      const btn = $("#amGPhoneBtn", modal);
      btn.disabled = true; btn.textContent = "Đang xử lý...";
      try {
        const d = await callAuth({ action: "google", idToken: googleIdToken, phone });
        TXDAuth.save(d.token, d.user);
        toast("✅ Đăng nhập Google thành công!");
        closeBackdrop(modal);
      } catch (err) { toast("⚠️ " + err.message); }
      finally { btn.disabled = false; btn.textContent = "Hoàn tất đăng nhập"; }
    });
  }

  async function handleGoogleCredential(resp) {
    const modal = ensureModal();
    openBackdrop(modal);
    try {
      const d = await callAuth({ action: "google", idToken: resp.credential });
      if (d.needPhone) {
        googleIdToken = resp.credential;
        $("#amForms", modal).style.display = "none";
        $("#amGoogleBox", modal).style.display = "none";
        $("#amPhoneStep", modal).style.display = "";
        if (d.suggestedName) $("#amTitle", modal).textContent = "Chào " + d.suggestedName + "!";
      } else {
        TXDAuth.save(d.token, d.user);
        toast("✅ Đăng nhập Google thành công!");
        closeBackdrop(modal);
      }
    } catch (err) { toast("⚠️ " + err.message); }
  }

  let googleReady = false;
  function initGoogle() {
    if (googleReady) return;
    if (typeof CONFIG === "undefined" || !CONFIG.googleClientId || !window.google || !google.accounts) return;
    const modal = ensureModal();
    google.accounts.id.initialize({ client_id: CONFIG.googleClientId, callback: handleGoogleCredential });
    $("#amGoogleBox", modal).style.display = "";
    google.accounts.id.renderButton($("#amGoogleBtn", modal), { theme: "outline", size: "large", width: 360, text: "continue_with", locale: "vi" });
    googleReady = true;
  }

  function openAuthModal() {
    const modal = ensureModal();
    resetModal();
    openBackdrop(modal);
    initGoogle();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-account").forEach((a) => {
      a.addEventListener("click", (e) => {
        if (!TXDAuth.user()) { e.preventDefault(); openAuthModal(); }
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl && modalEl.classList.contains("show")) closeBackdrop(modalEl);
    });
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.google && google.accounts) { clearInterval(t); initGoogle(); }
      else if (tries > 40) clearInterval(t);
    }, 250);
  });

  window.TXDAuthModal = { open: openAuthModal };
})();
