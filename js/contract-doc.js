// Xuất hợp đồng thành tệp Word .doc (HTML tương thích Microsoft Word).
(function (global) {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa xác nhận";

  function paragraphs(text) {
    return String(text || "").split(/\r?\n/).map((raw, index) => {
      const line = raw.trim();
      if (!line) return '<p class="blank">&nbsp;</p>';
      const safe = esc(line);
      if (index === 0) return `<p class="national">${safe}</p>`;
      if (index === 1) return `<p class="motto">${safe}</p>`;
      if (/^-{3,}oOo-{3,}$/i.test(line)) return `<p class="divider">${safe}</p>`;
      if (/^HỢP ĐỒNG /.test(line)) return `<p class="doc-title">${safe}</p>`;
      if (/^Số:/.test(line)) return `<p class="doc-number">${safe}</p>`;
      if (/^ĐIỀU \d+/.test(line)) return `<p class="article">${safe}</p>`;
      if (/^BÊN (CHO THUÊ|THUÊ)/.test(line) || /^XÁC NHẬN ĐIỆN TỬ/.test(line)) return `<p class="party">${safe}</p>`;
      if (/^- Căn cứ/.test(line)) return `<p class="basis">${safe}</p>`;
      if (/^\d+\./.test(line)) return `<p class="clause">${safe}</p>`;
      return `<p>${safe}</p>`;
    }).join("");
  }

  function build(options) {
    const o = options || {};
    const signature = o.signature ? `<img src="${o.signature}" alt="Chữ ký Bên B">` : '<div class="signature-line"></div>';
    const evidence = o.signedAt ? `<div class="evidence"><b>THÔNG TIN XÁC NHẬN ĐIỆN TỬ</b><br>Mã hợp đồng: ${esc(o.code)} · Thời điểm xác nhận: ${esc(fmtTime(o.signedAt))}${o.contentHash ? `<br>Mã kiểm tra toàn vẹn (SHA-256): ${esc(o.contentHash)}` : ""}</div>` : "";
    return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Hợp đồng ${esc(o.code)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]--><style>
      @page Section1{size:595.3pt 841.9pt;margin:56.7pt 56.7pt 56.7pt 70.9pt;mso-header-margin:35.4pt;mso-footer-margin:35.4pt}
      div.Section1{page:Section1}body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.5;color:#000}p{margin:0 0 6pt;text-align:justify}.blank{margin:0;font-size:4pt}.national,.motto,.divider,.doc-title,.doc-number{text-align:center}.national,.motto{font-weight:bold}.motto{text-decoration:underline}.divider{font-size:10pt}.doc-title{font-weight:bold;font-size:16pt;margin-top:12pt;margin-bottom:3pt}.doc-number{font-style:italic;margin-bottom:14pt}.basis{font-style:italic;margin-left:14pt;text-indent:-14pt}.party,.article{font-weight:bold;margin-top:10pt}.article{text-align:left}.clause{margin-left:18pt;text-indent:-18pt}.signature-table{width:100%;border-collapse:collapse;margin-top:22pt;page-break-inside:avoid}.signature-table td{width:50%;text-align:center;vertical-align:top;border:0;padding:0 12pt}.signature-role{font-weight:bold;text-transform:uppercase}.signature-note{font-style:italic;font-size:11pt}.signature-table img{width:180pt;height:72pt;object-fit:contain;display:block;margin:8pt auto 0}.signature-line{height:72pt}.signer-name{font-weight:bold;margin-top:4pt}.evidence{margin-top:18pt;border:1pt solid #777;padding:9pt;font-size:10pt;line-height:1.35;page-break-inside:avoid}
    </style></head><body><div class="Section1">${paragraphs(o.content)}<table class="signature-table"><tr><td><div class="signature-role">ĐẠI DIỆN BÊN A</div><div class="signature-note">Xác nhận theo hồ sơ hệ thống</div><div class="signature-line"></div><div class="signer-name">TIMXEDIEN.COM</div></td><td><div class="signature-role">BÊN B — NGƯỜI THUÊ</div><div class="signature-note">Ký và ghi rõ họ tên</div>${signature}<div class="signer-name">${esc(o.signerName || "")}</div></td></tr></table>${evidence}</div></body></html>`;
  }

  function download(options) {
    const html = "\ufeff" + build(options);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "application/msword;charset=utf-8" }));
    a.download = "hop-dong-" + String(options.code || "thue-xe") + ".doc";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  global.TXDContractDoc = { build, download };
})(window);
