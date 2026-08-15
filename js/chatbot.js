(function () {
  const floats = document.querySelector(".floats");
  if (!floats) return;

  const toggle = document.createElement("button");
  toggle.className = "float-btn chatbot-fab";
  toggle.id = "chatbotToggle";
  toggle.setAttribute("aria-label", "Chat tư vấn");
  toggle.innerHTML = '💬<span class="badge-new" id="chatbotBadge">1</span>';
  floats.insertBefore(toggle, floats.firstChild);

  const panel = document.createElement("div");
  panel.className = "chatbot-panel";
  panel.id = "chatbotPanel";
  panel.innerHTML = `
    <div class="chatbot-head">
      <div><b>Trợ lý TimXeDien</b><span>Trả lời tự động 24/7</span></div>
      <button id="chatbotClose" aria-label="Đóng" type="button">✕</button>
    </div>
    <div class="chatbot-body" id="chatbotBody"></div>
    <form class="chatbot-input" id="chatbotForm">
      <input id="chatbotInput" placeholder="Nhập câu hỏi..." autocomplete="off" maxlength="500">
      <button type="submit" aria-label="Gửi">➤</button>
    </form>`;
  document.body.appendChild(panel);

  const body = panel.querySelector("#chatbotBody");
  const form = panel.querySelector("#chatbotForm");
  const input = panel.querySelector("#chatbotInput");
  const badge = toggle.querySelector("#chatbotBadge");
  const history = [];
  let opened = false;
  let sending = false;

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = "chat-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "chat-msg bot typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !opened) {
      opened = true;
      badge.style.display = "none";
      addMsg("bot", "Xin chào! Mình là trợ lý ảo của TimXeDien.com. Bạn hỏi mình về giá thuê, loại xe, thủ tục... nhé!");
      setTimeout(() => input.focus(), 150);
    }
  });
  panel.querySelector("#chatbotClose").addEventListener("click", () => panel.classList.remove("open"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg || sending) return;
    sending = true;
    input.value = "";
    addMsg("user", msg);
    const typingEl = showTyping();

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chatbot", message: msg, history })
      });
      const data = await res.json();
      typingEl.remove();
      if (!res.ok || !data.ok) {
        addMsg("bot", (data && data.error) || "Xin lỗi, mình chưa trả lời được. Bạn nhắn Zalo hoặc gọi hotline giúp mình nhé!");
      } else {
        addMsg("bot", data.reply);
        history.push({ role: "user", text: msg });
        history.push({ role: "model", text: data.reply });
      }
    } catch (err) {
      typingEl.remove();
      addMsg("bot", "Kết nối bị gián đoạn. Bạn thử lại hoặc nhắn Zalo giúp mình nhé!");
    } finally {
      sending = false;
      input.focus();
    }
  });
})();
