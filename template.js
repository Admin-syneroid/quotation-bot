// template.js — Builds the Syneroid / GPC Smart quotation HTML from Quinn's JSON payload.
// Design ported verbatim from the Claude Design handoff (project/uploads/syneroid-quotation-template.html),
// with the "ClickUp Brain" credit chrome removed and the footer corrected to "Inc.".
// Every dynamic value is HTML-escaped. Line items and the optional delivery / special-instructions blocks render conditionally.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const CURRENCY_LABEL = { USD: "USD ($)", EUR: "EUR (€)", GBP: "GBP (£)", CAD: "CAD (CA$)", MXN: "MXN (MX$)" };

const CSS = `
  :root{
    --blue: oklch(70% 0.14 210);
    --blue-press: oklch(62% 0.13 210);
    --blue-tint: oklch(96% 0.03 210);
    --dark: oklch(28% 0.008 30);
    --fg: oklch(22% 0.005 30);
    --fg-secondary: oklch(42% 0.008 30);
    --fg-tertiary: oklch(58% 0.006 30);
    --surface: oklch(98.5% 0.002 210);
    --border: oklch(90% 0.005 210);
    --white: oklch(99.5% 0.002 210);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 0; }
  body{ font-family:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif; font-size:14px; line-height:1.5; color:var(--fg); background:var(--white); font-optical-sizing:auto; -webkit-font-smoothing:antialiased; }
  .page{ max-width:850px; margin:0 auto; padding:48px 56px; min-height:100vh; display:flex; flex-direction:column; }
  .header{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:32px; border-bottom:2px solid var(--blue); margin-bottom:36px; }
  .brand{ display:flex; flex-direction:column; gap:6px; }
  .brand-name{ font-size:1.5rem; font-weight:800; color:var(--blue); letter-spacing:-0.02em; }
  .brand-sub{ font-size:0.75rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--fg-tertiary); }
  .quote-badge{ background:var(--blue); color:var(--white); padding:12px 24px; border-radius:5px; text-align:right; }
  .quote-badge h1{ font-size:1.1rem; font-weight:700; letter-spacing:0.04em; }
  .quote-badge .qnum{ font-size:0.8rem; font-weight:500; opacity:0.9; margin-top:2px; }
  .meta-row{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px; margin-bottom:36px; }
  .meta-item{ background:var(--surface); border-radius:8px; padding:16px 20px; }
  .meta-label{ font-size:0.7rem; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--fg-tertiary); margin-bottom:4px; }
  .meta-value{ font-size:0.9rem; font-weight:600; color:var(--fg); }
  .parties{ display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:40px; }
  .party{ padding:20px 24px; border-radius:8px; border:1px solid var(--border); }
  .party--from{ background:var(--blue-tint); border-color:oklch(88% 0.04 210); }
  .party-title{ font-size:0.7rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--blue-press); margin-bottom:12px; }
  .party--to .party-title{ color:var(--fg-tertiary); }
  .party-name{ font-size:1rem; font-weight:700; color:var(--fg); margin-bottom:8px; }
  .party-detail{ font-size:0.82rem; color:var(--fg-secondary); line-height:1.6; }
  .party-detail a{ color:var(--blue); text-decoration:none; }
  .section-title{ font-size:0.85rem; font-weight:700; color:var(--fg); margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid var(--border); }
  .items-table{ width:100%; border-collapse:collapse; margin-bottom:32px; font-variant-numeric:tabular-nums; }
  .items-table thead{ background:var(--dark); color:var(--white); }
  .items-table th{ font-size:0.7rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; padding:12px 16px; text-align:left; }
  .items-table th:first-child{ border-radius:5px 0 0 5px; }
  .items-table th:last-child{ border-radius:0 5px 5px 0; text-align:right; }
  .items-table td{ padding:14px 16px; font-size:0.85rem; border-bottom:1px solid var(--border); }
  .items-table td:last-child{ text-align:right; font-weight:600; }
  .items-table tr:last-child td{ border-bottom:none; }
  .financial{ display:flex; justify-content:flex-end; margin-bottom:40px; }
  .financial-box{ width:320px; border-radius:8px; overflow:hidden; border:1px solid var(--border); }
  .fin-row{ display:flex; justify-content:space-between; padding:12px 20px; font-size:0.85rem; font-variant-numeric:tabular-nums; }
  .fin-row:not(:last-child){ border-bottom:1px solid var(--border); }
  .fin-row--total{ background:var(--blue); color:var(--white); font-weight:700; font-size:1rem; border:none; }
  .fin-label{ color:var(--fg-secondary); }
  .fin-row--total .fin-label{ color:var(--white); opacity:0.9; }
  .fin-value{ font-weight:600; }
  .terms{ background:var(--surface); border-radius:8px; padding:24px 28px; margin-bottom:40px; }
  .terms h3{ font-size:0.8rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--fg); margin-bottom:12px; }
  .terms p{ font-size:0.82rem; color:var(--fg-secondary); line-height:1.7; max-width:65ch; }
  .terms p + p{ margin-top:10px; }
  .signature-section{ margin-top:auto; padding-top:32px; border-top:1px solid var(--border); }
  .sig-intro{ font-size:0.82rem; color:var(--fg-secondary); margin-bottom:28px; line-height:1.6; }
  .sig-grid{ display:grid; grid-template-columns:1fr 1fr; gap:40px; }
  .sig-block{ display:flex; flex-direction:column; gap:20px; }
  .sig-line{ border-bottom:1.5px solid var(--dark); padding-bottom:8px; min-height:48px; display:flex; align-items:flex-end; font-size:0.85rem; font-weight:600; color:var(--fg); }
  .sig-line-label{ font-size:0.7rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--fg-tertiary); margin-top:4px; }
  .footer{ margin-top:40px; padding-top:20px; border-top:2px solid var(--blue); display:flex; justify-content:space-between; align-items:center; }
  .footer-left{ font-size:0.72rem; color:var(--fg-tertiary); }
  .footer-right{ font-size:0.72rem; color:var(--fg-tertiary); text-align:right; }
  .footer a{ color:var(--blue); text-decoration:none; font-weight:500; }
  @media print { body{ background:white; } .page{ padding:36px 48px; max-width:none; } * { box-shadow:none !important; } }
`;

export function buildHtml(payload) {
  const q = payload || {};
  const client = q.client || {};
  const fin = q.financial || {};
  const signoff = q.signoff || {};
  const delivery = q.delivery || {};
  const items = Array.isArray(q.line_items) ? q.line_items : [];
  const currency = CURRENCY_LABEL[fin.currency] || esc(fin.currency || "");
  const billing = esc(client.billing_address || "").replace(/\n/g, "<br>");

  const rows =
    items
      .map(
        (it) => `
      <tr>
        <td>${esc(it.sku)}</td>
        <td>${esc(it.description)}</td>
        <td>${esc(it.qty)}</td>
        <td>${esc(it.unit_price)}</td>
        <td>${esc(it.line_total)}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="5" style="color:var(--fg-tertiary)">No line items.</td></tr>`;

  const deliveryRow =
    delivery && String(delivery.cost || "").trim()
      ? `<div class="fin-row"><span class="fin-label">Delivery${delivery.description ? " &middot; " + esc(delivery.description) : ""}</span><span class="fin-value">${esc(delivery.cost)}</span></div>`
      : "";

  const specialBlock =
    q.special_instructions && String(q.special_instructions).trim()
      ? `<div class="terms" style="margin-bottom:32px"><h3>Special Instructions</h3><p>${esc(q.special_instructions).replace(/\n/g, "<br>")}</p></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quotation ${esc(q.quote_number)} - Syneroid Technologies</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <header class="header">
    <div class="brand">
      <div class="brand-name">GPC Smart</div>
      <div class="brand-sub">Syneroid Technologies Inc.</div>
    </div>
    <div class="quote-badge">
      <h1>QUOTATION</h1>
      <div class="qnum">${esc(q.quote_number)}</div>
    </div>
  </header>

  <div class="meta-row">
    <div class="meta-item"><div class="meta-label">Date of Issue</div><div class="meta-value">${esc(q.date_of_issue)}</div></div>
    <div class="meta-item"><div class="meta-label">Valid Until</div><div class="meta-value">${esc(q.validity_date)}</div></div>
    <div class="meta-item"><div class="meta-label">Currency</div><div class="meta-value">${currency}</div></div>
  </div>

  <div class="parties">
    <div class="party party--from">
      <div class="party-title">From</div>
      <div class="party-name">Syneroid Technologies Inc.</div>
      <div class="party-detail">
        15 West 38 Street, New York, NY<br>
        +1-855-ID MY PET<br>
        <a href="mailto:info@syneroid.com">info@syneroid.com</a><br>
        <a href="https://gpcsmart.com">gpcsmart.com</a>
      </div>
    </div>
    <div class="party party--to">
      <div class="party-title">Prepared For</div>
      <div class="party-name">${esc(client.company_name)}</div>
      <div class="party-detail">
        ${esc(client.contact_name)}${client.contact_name ? "<br>" : ""}${billing}${billing ? "<br>" : ""}<a href="mailto:${esc(client.email)}">${esc(client.email)}</a>
      </div>
    </div>
  </div>

  <div class="section-title">Scope of Work &amp; Pricing</div>
  <table class="items-table">
    <thead><tr><th>Item / SKU</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="financial">
    <div class="financial-box">
      <div class="fin-row"><span class="fin-label">Subtotal</span><span class="fin-value">${esc(fin.subtotal)}</span></div>
      ${deliveryRow}
      <div class="fin-row"><span class="fin-label">Tax</span><span class="fin-value">${esc(fin.tax_amount)}</span></div>
      <div class="fin-row fin-row--total"><span class="fin-label">Grand Total</span><span class="fin-value">${esc(fin.grand_total)}</span></div>
    </div>
  </div>

  ${specialBlock}

  <div class="terms">
    <h3>Payment Terms &amp; Methods</h3>
    <p>Payment details, milestones, and specific terms will be outlined upon invoice issuance based on the agreed project scope.</p>
    <p>Payments are processed via Wise Business. We accept Direct Deposits (in multiple global currencies), Wire Transfers, and SWIFT payments. Banking routing details will be provided on the final invoice.</p>
    <p style="margin-top:10px;font-weight:600;color:var(--fg)">Valid for 30 days from date of issue.</p>
  </div>

  <div class="signature-section">
    <p class="sig-intro">By signing below, the client agrees to the pricing, specifications, and terms outlined in this quotation.</p>
    <div class="sig-grid">
      <div class="sig-block">
        <div><div class="sig-line"></div><div class="sig-line-label">Authorized Signature</div></div>
        <div><div class="sig-line">${esc(signoff.signatory_name)}</div><div class="sig-line-label">Printed Name / Title</div></div>
      </div>
      <div class="sig-block">
        <div><div class="sig-line"></div><div class="sig-line-label">Date</div></div>
        <div><div class="sig-line">${esc(signoff.po_number)}</div><div class="sig-line-label">Client PO Number (if applicable)</div></div>
      </div>
    </div>
  </div>

  <footer class="footer">
    <div class="footer-left">&copy; 2026 Syneroid Technologies Inc.</div>
    <div class="footer-right"><a href="https://gpcsmart.com">gpcsmart.com</a> &middot; <a href="https://syneroid.com">syneroid.com</a></div>
  </footer>
</div>
</body>
</html>`;
}
