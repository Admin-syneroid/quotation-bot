// index.js — Syneroid Quotation Bot
// Polls the ClickUp Quotations list for tasks that have Quinn's JSON comment and have NOT been processed,
// renders the branded quotation PDF (headless Chrome via Puppeteer), posts it to Slack, then marks the task done.
// Runs autonomously on GitHub Actions (see .github/workflows/quotations.yml). No human, no cost.

import fs from "node:fs";
import { WebClient } from "@slack/web-api";
import puppeteer from "puppeteer";
import { buildHtml } from "./template.js";

// Embed the real GPC Smart logo as a data URI so the render is self-contained (no external asset fetch).
let LOGO = "";
try {
  LOGO = "data:image/png;base64," + fs.readFileSync(new URL("./logo-gpc-smart.png", import.meta.url)).toString("base64");
} catch {
  console.warn("logo-gpc-smart.png not found next to index.js — falling back to text wordmark.");
}

const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const LIST_ID = process.env.CLICKUP_LIST_ID || "901327717511";
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || "C0BEDJ1NT41";
const MARKER = "[[PDF_SENT]]"; // written back as a comment so a task is never processed twice

if (!CLICKUP_TOKEN || !process.env.SLACK_TOKEN) {
  console.error("Missing CLICKUP_TOKEN or SLACK_TOKEN env var. Set them as GitHub repo secrets.");
  process.exit(1);
}

const slack = new WebClient(process.env.SLACK_TOKEN);

async function cu(path, opts = {}) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    ...opts,
    headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`ClickUp ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Pull a JSON object out of Quinn's comment text (handles ```json fences, bare fences, or raw JSON).
function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function renderPdf(browser, html) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    return await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await page.close();
  }
}

async function main() {
  const { tasks } = await cu(`/list/${LIST_ID}/task?archived=false&include_closed=false&subtasks=false&page=0`);
  if (!tasks || !tasks.length) {
    console.log("No open tasks in the Quotations list.");
    return;
  }

  let browser = null;
  let processed = 0;

  for (const task of tasks) {
    try {
      const { comments } = await cu(`/task/${task.id}/comment`);
      const list = comments || [];
      if (list.some((c) => (c.comment_text || "").includes(MARKER))) continue; // already done

      // Quinn's JSON — search newest-first for the first parseable payload.
      let data = null;
      for (let i = list.length - 1; i >= 0; i--) {
        data = extractJson(list[i].comment_text);
        if (data) break;
      }
      if (!data) continue; // Quinn hasn't posted the JSON yet — pick it up on a later run (no race)

      const quoteNo = data.quote_number || task.id;
      const company = data?.client?.company_name || "the client";

      if (!browser) browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
      const pdf = await renderPdf(browser, buildHtml(data, LOGO));

      await slack.files.uploadV2({
        channel_id: SLACK_CHANNEL_ID,
        file: Buffer.from(pdf),
        filename: `${quoteNo}.pdf`,
        title: `Quotation ${quoteNo} — ${company}`,
        initial_comment: `<!channel> Here is the quotation *${quoteNo}* for *${company}*. Please download it, open it on your machine, and print / save as PDF to send.`,
      });

      await cu(`/task/${task.id}/comment`, {
        method: "POST",
        body: JSON.stringify({ comment_text: `${MARKER} Quotation ${quoteNo} rendered + posted to Slack ${new Date().toISOString()}`, notify_all: false }),
      });

      processed++;
      console.log(`OK  ${task.id}  ${quoteNo}  -> #quotes`);
    } catch (err) {
      console.error(`ERR ${task.id}: ${err.message}`); // one bad task never kills the run
    }
  }

  if (browser) await browser.close();
  console.log(`Done. ${processed} quotation(s) processed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
