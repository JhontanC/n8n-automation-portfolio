# n8n Automation Portfolio

> **Independent demo projects.** All projects use a fictional company and synthetic data. No real customer data is involved.

Three connected automation case studies built around one scenario: **CoolAir**, a fictional air-conditioning company that receives quote requests and needs to capture leads, keep its team informed and track conversions.

```text
[Website quote form]
        │
        ▼
[1. LeadFlow]  n8n validates the lead → HubSpot contact + deal (no duplicates)
        │
        ▼
[2. CRM Sync]  n8n mirrors HubSpot → Google Sheets, notifies the team in Slack
        │
        ▼
[3. Analytics] Looker Studio dashboard: leads, sources, pipeline, conversions
```

**HubSpot is the source of truth.** Google Sheets is a read-only mirror for reporting.

## Projects

| # | Project | What it shows | Stack | Status |
|---|---|---|---|---|
| 1 | [**LeadFlow — Lead Capture & CRM Automation**](project-01-leadflow/) | Webhook intake, validation and normalization, contact deduplication, deal rules, honest error handling | n8n · HubSpot API · HTML/JS | ✅ Done |
| 2 | **CRM Sync & Slack Notifications** | Upsert HubSpot records into Google Sheets, stage-change alerts without repeated notifications, retries | n8n · HubSpot · Google Sheets · Slack | 🛠️ In progress |
| 3 | **Sales & Marketing Analytics** | One-page pipeline dashboard with documented metric definitions | Google Sheets · Looker Studio | 🗓️ Planned |

## What every project covers

- **Problem:** the pain of the (fictional) business.
- **Solution:** the workflow and why it was designed that way.
- **Reliability:** invalid input, duplicates and API failures.
- **Evidence:** screenshots, a short demo video and documented test cases.
- **Limitations:** what is demo-only and what production would require.

## Principles

- No credentials, tokens or private URLs in this repository. Workflows are exported with credentials removed.
- Only synthetic data (`example.com` emails, `555-01xx` phone numbers).
- No claims of time saved or ROI without real measurements.
