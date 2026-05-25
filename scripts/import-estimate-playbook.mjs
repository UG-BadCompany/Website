import { getDatabase } from '@netlify/database';

const SHEET_KEY = process.env.ESTIMATOR_PLAYBOOK_SHEET_KEY || '1ndbMbAbD2R4LmB9PUspQsM3eyCyx6QdTiB4Iy36lE-U';

const TABS = [
  { gid: '0', name: 'Estimator Catalog' },
  { gid: '1832149945', name: 'Labor Modifiers' },
  { gid: '1869887544', name: 'Parts Library' },
  { gid: '982476591', name: 'Troubleshooting Flows' },
  { gid: '142173290', name: 'AI Tool Instructions' },
];

const csvUrl = (gid) => `https://docs.google.com/spreadsheets/d/${SHEET_KEY}/export?format=csv&gid=${gid}`;

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field.trim());
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length || row.length) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value !== ''));
};

const toObjects = (rows) => {
  if (!rows.length) return [];
  const headers = rows[0].map((h, index) => h || `column_${index + 1}`);
  return rows.slice(1).map((values, index) => ({
    row_number: index + 2,
    row_payload: headers.reduce((acc, header, i) => {
      acc[header] = values[i] ?? '';
      return acc;
    }, {}),
  })).filter((row) => Object.values(row.row_payload).some((value) => `${value}`.trim() !== ''));
};

const sync = async () => {
  const db = getDatabase();
  for (const tab of TABS) {
    const response = await fetch(csvUrl(tab.gid));
    if (!response.ok) throw new Error(`Failed to load ${tab.name}: ${response.status}`);
    const csv = await response.text();
    const rowObjects = toObjects(parseCsv(csv));

    await db.sql`delete from estimate_playbook_entries where sheet_key = ${SHEET_KEY} and source_gid = ${tab.gid}`;
    for (const row of rowObjects) {
      await db.sql`
        insert into estimate_playbook_entries (sheet_key, source_gid, source_tab, row_number, row_payload)
        values (${SHEET_KEY}, ${tab.gid}, ${tab.name}, ${row.row_number}, ${JSON.stringify(row.row_payload)}::jsonb)
      `;
    }
    console.log(`Synced ${tab.name}: ${rowObjects.length} rows`);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  sync().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseCsv, toObjects, sync };
