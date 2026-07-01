// template.js — Builds the Syneroid / GPC Smart quotation HTML from Quinn's JSON payload.
// Faithful port of the PRIMARY Claude Design file (project/Syneroid Quotation.dc.html):
// real GPC Smart logo, Montserrat, exact GPC brand hex, full-name currency, blue-bordered special-instructions.
// Footer corrected to "Inc." Every dynamic value is HTML-escaped. buildHtml(payload, logoSrc) — logoSrc is a
// data: URI (production) or a file:// path (local test); if empty, falls back to a text wordmark.

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const CURRENCY = {
  USD: "USD &mdash; US Dollar ($)",
  EUR: "EUR &mdash; Euro (&euro;)",
  GBP: "GBP &mdash; British Pound (&pound;)",
  CAD: "CAD &mdash; Canadian Dollar (CA$)",
  MXN: "MXN &mdash; Mexican Peso (MX$)",
};

const CSS = `
  *{ margin:0; padding:0; box-sizing:border-box; }
  @page{ size:A4; margin:14mm; }
  html{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body{ font-family:'Montserrat',-apple-system,BlinkMacSystemFont,system-ui,sans-serif; color:#353334; background:#fff; -webkit-font-smoothing:antialiased; }
  .doc{ background:#fff; }
  @media screen{ body{ background:#EEEEEF; } .doc{ max-width:210mm; margin:24px auto; padding:18mm 16mm; box-shadow:0 4px 24px rgba(0,0,0,.08); } }

  .header{ display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:22px; border-bottom:3px solid #02B1EC; margin-bottom:30px; }
  .logo{ height:58px; width:auto; display:block; }
  .logo-text{ font-size:26px; font-weight:800; color:#02B1EC; letter-spacing:-.02em; }
  .badge{ background:#02B1EC; color:#fff; padding:14px 22px; border-radius:5px; text-align:right; min-width:180px; }
  .badge .t{ font-size:18px; font-weight:700; letter-spacing:.1em; }
  .badge .q{ font-size:13px; font-weight:500; letter-spacing:.03em; opacity:.92; margin-top:3px; }

  .meta{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:30px; }
  .meta .cell{ background:#F6F6F7; border-radius:6px; padding:14px 16px; }
  .meta .cell.cur{ background:#E6F7FD; }
  .meta .lbl{ font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#7B8898; margin-bottom:5px; }
  .meta .cell.cur .lbl{ color:#0299CC; }
  .meta .val{ font-size:14px; font-weight:700; color:#353334; }

  .parties{ display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
  .party{ padding:18px 20px; border-radius:8px; }
  .party.from{ background:#E6F7FD; border:1px solid #B8E9F9; }
  .party.to{ background:#fff; border:1px solid #E4E4E5; }
  .ptitle{ font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; margin-bottom:10px; }
  .party.from .ptitle{ color:#0299CC; }
  .party.to .ptitle{ color:#7B8898; }
  .pname{ font-size:15px; font-weight:700; color:#353334; margin-bottom:8px; }
  .party.to .pname{ margin-bottom:2px; }
  .pcontact{ font-size:12.5px; font-weight:600; color:#353334; margin-bottom:6px; }
  .pdet{ font-size:12.5px; font-weight:400; color:#7E7E7E; line-height:1.65; }
  .pdet a{ color:#02B1EC; text-decoration:none; font-weight:500; }

  .scope-title{ font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#353334; margin-bottom:12px; }
  table.items{ width:100%; border-collapse:collapse; margin-bottom:26px; font-variant-numeric:tabular-nums; }
  table.items thead tr{ background:#353334; color:#fff; }
  table.items th{ font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:11px 14px; text-align:left; }
  table.items th.qty{ text-align:center; width:52px; }
  table.items th.num{ text-align:right; width:100px; }
  table.items th:first-child{ border-radius:5px 0 0 5px; }
  table.items th:last-child{ border-radius:0 5px 5px 0; }
  table.items td{ padding:13px 14px; font-size:12.5px; border-bottom:1px solid #E4E4E5; }
  table.items tr:last-child td{ border-bottom:none; }
  td.sku{ font-weight:600; color:#353334; }
  td.desc{ color:#7E7E7E; }
  td.qty{ color:#353334; text-align:center; }
  td.num{ color:#353334; text-align:right; }
  td.total{ font-weight:700; color:#353334; text-align:right; }

  .fin-wrap{ display:flex; justify-content:flex-end; margin-bottom:30px; }
  .fin{ width:300px; border-radius:8px; overflow:hidden; border:1px solid #E4E4E5; font-variant-numeric:tabular-nums; }
  .fin .row{ display:flex; justify-content:space-between; padding:11px 18px; font-size:13px; border-bottom:1px solid #E4E4E5; }
  .fin .row .l{ color:#7E7E7E; } .fin .row .v{ font-weight:600; color:#353334; }
  .fin .row.total{ padding:14px 18px; background:#02B1EC; border-bottom:none; font-weight:700; font-size:15px; }
  .fin .row.total .l{ color:#fff; opacity:.92; } .fin .row.total .v{ color:#fff; }

  .special{ background:#F6F6F7; border-radius:8px; border-left:4px solid #02B1EC; padding:16px 20px; margin-bottom:22px; }
  .special .lbl{ font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#353334; margin-bottom:7px; }
  .special .txt{ font-size:12.5px; font-weight:400; color:#7E7E7E; line-height:1.6; }

  .terms{ background:#F6F6F7; border-radius:8px; padding:18px 22px; margin-bottom:22px; }
  .terms .lbl{ font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#353334; margin-bottom:12px; }
  .terms p{ font-size:12px; font-weight:400; color:#7E7E7E; line-height:1.65; }
  .terms p + p{ margin-top:8px; }

  .validity{ font-size:11px; font-weight:600; letter-spacing:.04em; color:#7B8898; text-align:center; margin-bottom:26px; }

  .sign{ padding-top:22px; border-top:1px solid #E4E4E5; }
  .sign .intro{ font-size:12px; font-weight:400; color:#7E7E7E; line-height:1.6; margin-bottom:26px; }
  .sign-grid{ display:grid; grid-template-columns:1fr 1fr; gap:36px; }
  .sign-col{ display:flex; flex-direction:column; gap:22px; }
  .sig-line{ border-bottom:1.5px solid #353334; min-height:34px; }
  .sig-line.filled{ display:flex; align-items:flex-end; padding-bottom:4px; font-size:13px; font-weight:600; color:#353334; }
  .sig-lbl{ font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#7B8898; margin-top:6px; }

  footer.foot{ margin-top:32px; padding-top:16px; border-top:3px solid #02B1EC; display:flex; justify-content:space-between; align-items:center; }
  footer.foot .l{ font-size:10.5px; font-weight:500; color:#7B8898; }
  footer.foot .r{ font-size:10.5px; font-weight:500; }
  footer.foot .r a{ color:#02B1EC; text-decoration:none; }
`;

export function buildHtml(payload, logoSrc = "") {
  const q = payload || {};
  const client = q.client || {};
  const fin = q.financial || {};
  const signoff = q.signoff || {};
  const delivery = q.delivery || {};
  const items = Array.isArray(q.line_items) ? q.line_items : [];
  const currency = CURRENCY[fin.currency] || esc(fin.currency || "");
  const billing = esc(client.billing_address || "").replace(/\n/g, "<br>");

  const logo = logoSrc
    ? `<img class="logo" src="${logoSrc}" alt="GPC Smart — Get Pet Connected">`
    : `<div class="logo-text">GPC Smart</div>`;

  const rows =
    items
      .map(
        (it) => `
          <tr>
            <td class="sku">${esc(it.sku)}</td>
            <td class="desc">${esc(it.description)}</td>
            <td class="qty">${esc(it.qty)}</td>
            <td class="num">${esc(it.unit_price)}</td>
            <td class="total">${esc(it.line_total)}</td>
          </tr>`
      )
      .join("") || `<tr><td class="desc" colspan="5">No line items.</td></tr>`;

  const deliveryRow =
    delivery && String(delivery.cost || "").trim()
      ? `<div class="row"><span class="l">Delivery${delivery.description ? " &middot; " + esc(delivery.description) : ""}</span><span class="v">${esc(delivery.cost)}</span></div>`
      : "";

  const specialBlock =
    q.special_instructions && String(q.special_instructions).trim()
      ? `<div class="special"><div class="lbl">Special Instructions</div><div class="txt">${esc(q.special_instructions).replace(/\n/g, "<br>")}</div></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quotation ${esc(q.quote_number)} - Syneroid Technologies</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<main class="doc">

  <header class="header">
    ${logo}
    <div class="badge">
      <div class="t">QUOTATION</div>
      <div class="q">${esc(q.quote_number)}</div>
    </div>
  </header>

  <div class="meta">
    <div class="cell"><div class="lbl">Date of Issue</div><div class="val">${esc(q.date_of_issue)}</div></div>
    <div class="cell"><div class="lbl">Valid Until</div><div class="val">${esc(q.validity_date)}</div></div>
    <div class="cell cur"><div class="lbl">Currency</div><div class="val">${currency}</div></div>
  </div>

  <div class="parties">
    <div class="party from">
      <div class="ptitle">From</div>
      <div class="pname">Syneroid Technologies Inc.</div>
      <div class="pdet">
        15 West 38 Street, New York, NY<br>
        +1-855-ID MY PET<br>
        <a href="mailto:info@syneroid.com">info@syneroid.com</a><br>
        <a href="https://gpcsmart.com/">gpcsmart.com</a>
      </div>
    </div>
    <div class="party to">
      <div class="ptitle">Prepared For</div>
      <div class="pname">${esc(client.company_name)}</div>
      ${client.contact_name ? `<div class="pcontact">${esc(client.contact_name)}</div>` : ""}
      <div class="pdet">${billing}${billing ? "<br>" : ""}<a href="mailto:${esc(client.email)}">${esc(client.email)}</a></div>
    </div>
  </div>

  <div class="scope-title">Scope &amp; Pricing</div>
  <table class="items">
    <thead><tr>
      <th>Item / SKU</th><th>Description</th><th class="qty">Qty</th><th class="num">Unit Price</th><th class="num">Line Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="fin-wrap">
    <div class="fin">
      <div class="row"><span class="l">Subtotal</span><span class="v">${esc(fin.subtotal)}</span></div>
      ${deliveryRow}
      <div class="row"><span class="l">Tax</span><span class="v">${esc(fin.tax_amount)}</span></div>
      <div class="row total"><span class="l">Grand Total</span><span class="v">${esc(fin.grand_total)}</span></div>
    </div>
  </div>

  ${specialBlock}

  <div class="terms">
    <div class="lbl">Payment Terms &amp; Methods</div>
    <p>Payment details, milestones, and specific terms will be outlined upon invoice issuance based on the agreed project scope.</p>
    <p>Payments are processed via Wise Business. We accept Direct Deposits (in multiple global currencies), Wire Transfers, and SWIFT payments. Banking routing details will be provided on the final invoice.</p>
  </div>

  <div class="validity">Valid for 30 days from date of issue</div>

  <div class="sign">
    <p class="intro">By signing below, the client agrees to the pricing, specifications, and terms outlined in this quotation.</p>
    <div class="sign-grid">
      <div class="sign-col">
        <div><div class="sig-line"></div><div class="sig-lbl">Authorized Signature</div></div>
        <div><div class="sig-line${signoff.signatory_name ? " filled" : ""}">${esc(signoff.signatory_name)}</div><div class="sig-lbl">Client Signatory Name</div></div>
      </div>
      <div class="sign-col">
        <div><div class="sig-line"></div><div class="sig-lbl">Date</div></div>
        <div><div class="sig-line${signoff.po_number ? " filled" : ""}">${esc(signoff.po_number)}</div><div class="sig-lbl">PO Number</div></div>
      </div>
    </div>
  </div>

  <footer class="foot">
    <div class="l">&copy; 2026 Syneroid Technologies Inc.</div>
    <div class="r"><a href="https://gpcsmart.com/">gpcsmart.com</a> &middot; <a href="https://syneroid.com/">syneroid.com</a></div>
  </footer>

</main>
</body>
</html>`;
}
