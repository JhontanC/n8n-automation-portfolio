// Generates 12 months of synthetic CoolAir history for the Looker Studio dashboard.
// Output: seed-contacts.csv and seed-deals.csv, with the same columns as the
// `contacts` and `deals` tabs synced by Project 2, ready to append to the sheet.
//
// Usage: node generate-seed.js [outDir]
// Deterministic: the same seed always produces the same rows.

const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || __dirname;

// ---------- deterministic random ----------
let state = 20261030;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) if ((r -= w) < 0) return value;
  return pairs[pairs.length - 1][0];
};

// ---------- reference data ----------
const FIRST = ['Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'James', 'Sophia', 'Lucas', 'Mia', 'Ethan', 'Isabella', 'Mason',
  'Amelia', 'Logan', 'Harper', 'Daniel', 'Ella', 'Henry', 'Grace', 'Samuel', 'Chloe', 'David', 'Lily', 'Carlos', 'Sofia',
  'Mateo', 'Valentina', 'Diego', 'Camila', 'Gabriel'];
const LAST = ['Sample', 'Demo', 'Test', 'Example', 'Placeholder'];
const CITIES = [['Miami', 30], ['Orlando', 22], ['Tampa', 18], ['Fort Lauderdale', 12], ['Jacksonville', 10], ['West Palm Beach', 8]];
const SOURCES = [['website', 40], ['google_ads', 25], ['referral', 15], ['social_media', 15], ['other', 5]];
const SERVICES = [['maintenance', 30], ['repair', 30], ['installation', 20], ['inspection', 12], ['quote', 8]];
const SERVICE_LABEL = { installation: 'Installation', maintenance: 'Maintenance', repair: 'Repair', inspection: 'Inspection', quote: 'Quote' };
const AMOUNT = { installation: [3500, 7800], repair: [250, 950], maintenance: [150, 420], inspection: [120, 260], quote: [2500, 6500] };
// Share of deals that end up won, per service (installations are harder to close).
const WIN_RATE = { installation: 0.32, repair: 0.62, maintenance: 0.7, inspection: 0.55, quote: 0.22 };

// HubSpot default sales pipeline.
const OPEN_STAGES = [
  ['appointmentscheduled', 'Appointment Scheduled'],
  ['qualifiedtobuy', 'Qualified To Buy'],
  ['presentationscheduled', 'Presentation Scheduled'],
  ['decisionmakerboughtin', 'Decision Maker Bought-In'],
  ['contractsent', 'Contract Sent'],
];
const WON = ['closedwon', 'Closed Won'];
const LOST = ['closedlost', 'Closed Lost'];

// Leads per month (Nov 2025 - Oct 2026): seasonal, peaking in the Florida summer.
const MONTHS = [
  ['2025-11', 14], ['2025-12', 11], ['2026-01', 12], ['2026-02', 15], ['2026-03', 19], ['2026-04', 24],
  ['2026-05', 31], ['2026-06', 38], ['2026-07', 42], ['2026-08', 40], ['2026-09', 30], ['2026-10', 22],
];
const SEED_END = new Date('2026-10-27T23:59:59Z'); // live records synced from HubSpot start after this
const SYNCED_AT = '2026-10-30T12:00:00.000Z';

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();
const daysInMonth = (ym) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();

// ---------- generate ----------
const contacts = [];
const deals = [];
let n = 0;

for (const [ym, count] of MONTHS) {
  for (let i = 0; i < count; i++) {
    n += 1;
    const day = int(1, daysInMonth(ym));
    let created = Date.parse(`${ym}-${String(day).padStart(2, '0')}T${String(int(12, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00.000Z`);
    if (created > SEED_END.getTime()) created = SEED_END.getTime() - int(1, 20) * DAY;

    const first = pick(FIRST);
    const last = pick(LAST);
    const city = weighted(CITIES);
    const service = weighted(SERVICES);
    const source = weighted(SOURCES);
    const id = String(n).padStart(4, '0');
    const contactId = `seed-c-${id}`;

    // ~85% of leads become a deal (the rest were spam, out of area, or never answered).
    const hasDeal = rand() < 0.85;
    let lifecycle = 'lead';
    let updated = created + int(0, 2) * DAY;

    if (hasDeal) {
      const ageDays = (SEED_END.getTime() - created) / DAY;
      // Recent deals are more likely to still be open.
      const closeChance = ageDays > 45 ? 0.95 : ageDays > 20 ? 0.6 : 0.25;
      const closed = rand() < closeChance;
      const won = closed && rand() < WIN_RATE[service];
      const [stageId, stageLabel] = !closed ? pick(OPEN_STAGES) : won ? WON : LOST;
      const [lo, hi] = AMOUNT[service];
      const amount = Math.round(int(lo, hi) / 10) * 10;
      const closedAt = closed ? Math.min(created + int(2, 35) * DAY, SEED_END.getTime()) : null;
      const dealUpdated = closed ? closedAt : Math.min(created + int(1, 15) * DAY, SEED_END.getTime());
      updated = Math.max(updated, dealUpdated);
      lifecycle = won ? 'customer' : 'opportunity';

      deals.push({
        hubspot_deal_id: `seed-d-${id}`,
        hubspot_contact_id: contactId,
        deal_name: `AC ${SERVICE_LABEL[service]} - ${first} ${last} (${city})`,
        stage_id: stageId,
        stage_label: stageLabel,
        amount,
        created_at: iso(created),
        updated_at: iso(dealUpdated),
        is_closed: closed ? 'TRUE' : 'FALSE',
        is_won: won ? 'TRUE' : 'FALSE',
        notified_stage: stageId, // never triggers a Slack alert
        synced_at: SYNCED_AT,
        sync_status: 'seed',
        closed_at: closed ? iso(closedAt) : '',
      });
    }

    contacts.push({
      hubspot_contact_id: contactId,
      email: `${first}.${last}.${id}@example.com`.toLowerCase(),
      first_name: first,
      last_name: last,
      phone: `+1202555${String(100 + (n % 100)).padStart(4, '0')}`,
      city,
      lead_source: source,
      service_type: service,
      lifecycle_stage: lifecycle,
      created_at: iso(created),
      updated_at: iso(Math.min(updated, SEED_END.getTime())),
      synced_at: SYNCED_AT,
      sync_status: 'seed',
      new_lead_notified: 'seed', // never triggers a Slack alert
    });
  }
}

// ---------- write CSV ----------
const csv = (rows) => {
  const cols = Object.keys(rows[0]);
  const esc = (x) => (/[",\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x));
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
};
fs.writeFileSync(path.join(outDir, 'seed-contacts.csv'), csv(contacts));
fs.writeFileSync(path.join(outDir, 'seed-deals.csv'), csv(deals));

// ---------- summary (used to check the dashboard numbers) ----------
const won = deals.filter((d) => d.is_won === 'TRUE');
const lost = deals.filter((d) => d.stage_id === 'closedlost');
console.log(`contacts: ${contacts.length}, deals: ${deals.length}, won: ${won.length}, lost: ${lost.length}, open: ${deals.length - won.length - lost.length}`);
console.log(`won revenue: ${won.reduce((s, d) => s + d.amount, 0)}`);
const by = (rows, key) => rows.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {});
console.log('leads by source:', by(contacts, 'lead_source'));
console.log('leads by month:', by(contacts.map((c) => ({ m: c.created_at.slice(0, 7) })), 'm'));
console.log('won by close month:', by(won.map((d) => ({ m: d.closed_at.slice(0, 7) })), 'm'));
