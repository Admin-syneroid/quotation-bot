# Syneroid Quotation Bot

Fully automated, **zero-cost** quotation delivery. Runs on GitHub Actions — no server, no paid tools, no one at a desk.

**Flow:** Someone submits the ClickUp "Quotation Request v2" form → **Quinn** (the ClickUp super-agent) generates `SYN-Q-XXXX` and posts the JSON comment → **this bot** (running on a schedule) renders the branded quotation PDF from the real template and posts it to Slack `#1a-admin-quotes`, tagging `@channel`. It then leaves a `[[PDF_SENT]]` comment so the same quote is never sent twice.

It **polls** for Quinn's comment rather than firing on task-created, so there is no timing race — if the JSON isn't there yet, the task is simply picked up on the next run.

---

## What you do — one-time setup (~10 minutes)

### 1. Create the repo and push these files
```bash
cd "quotation-bot"
git init && git add . && git commit -m "Syneroid quotation bot"
gh repo create syneroid-quotation-bot --public --source=. --push
```
> Or make the repo on github.com and `git push` to it.
>
> **Private vs public:** the workflow ships set to **hourly**, which stays inside a **private** repo's free 2,000 Actions minutes/month (recommended — keeps the code private; a quote lands within the hour, or hit "Run workflow" to push one out instantly). A **public** repo gets *unlimited* free minutes, so you can bump the cron to `"*/10 * * * *"` (every 10 min). Either way the repo holds only code + the public logo — no secrets, no client data.

### 2. Add two repo secrets
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `CLICKUP_TOKEN` | Your ClickUp personal API token |
| `SLACK_TOKEN` | Your Slack **bot** token (`xoxb-...`) |

- **ClickUp token:** ClickUp → your avatar → **Settings → Apps → API Token → Generate**. Copy the `pk_...` value.
- **Slack bot token:** see step 3.

### 3. Create the Slack bot (once)
1. Go to **api.slack.com/apps → Create New App → From scratch** (name it "Quotation Bot", pick the Syneroid workspace).
2. **OAuth & Permissions → Bot Token Scopes** → add `files:write` and `chat:write`.
3. **Install to Workspace**, then copy the **Bot User OAuth Token** (`xoxb-...`) → that's `SLACK_TOKEN`.
4. In Slack, open **#1a-admin-quotes** and type `/invite @Quotation Bot` so the bot can post there.

That's it. The workflow runs every 10 minutes automatically. To fire it immediately (or test): repo → **Actions → Syneroid Quotations → Run workflow**.

---

## Re-sending a quote
The bot skips any task that already has a `[[PDF_SENT]]` comment. To regenerate/re-send a quotation, delete that comment on the ClickUp task; the next run will send it again.

## Files
| File | What it is |
|---|---|
| `index.js` | The orchestrator: reads ClickUp, renders, posts to Slack, marks done |
| `template.js` | The branded quotation template (the real GPC Smart design), filled from Quinn's JSON |
| `.github/workflows/quotations.yml` | The schedule (every 10 min + manual "Run workflow") |
| `package.json` | Dependencies (`puppeteer` for headless Chrome, `@slack/web-api`) |

## Config (already set in the workflow)
- **ClickUp list:** `901327717511` (Quotations) — override with the `CLICKUP_LIST_ID` env var.
- **Slack channel:** `C0BEDJ1NT41` (#1a-admin-quotes) — override with `SLACK_CHANNEL_ID`.

## Notes / mapping decisions
- **Delivery** (`delivery.cost`) renders as a line in the financial box (Subtotal → Delivery → Tax → Grand Total) when present.
- **Special Instructions** render as a block above the signature when non-empty.
- **PO number** and **signatory name** prefill the signature grid.
- Prices are placed exactly as Quinn formats them (Quinn writes the currency symbols); the meta "Currency" field maps the ISO code to a symbol.
- Footer reads **Syneroid Technologies Inc.** (corrected from "Corporation").
