#!/usr/bin/env node
// Offline manual update only. Never fetch from AMFI or another website.
// Usage: node scripts/update-open-ended-roster.mjs downloaded-schemes.csv YYYY-MM-DD
import { readFile, writeFile } from 'node:fs/promises';

const [, , input, asOf] = process.argv;
if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? '') ||
  new Date(asOf + 'T00:00:00Z').toISOString().slice(0,10) !== asOf) {
  throw new Error('Usage: node scripts/update-open-ended-roster.mjs downloaded.csv YYYY-MM-DD');
}
const raw = await readFile(input,'utf8');
if (raw.length > 15_000_000) throw new Error('Manual source exceeds size limit.');
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i+1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell=''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && text[i+1] === '\n') i++;
      row.push(cell); cell='';
      if (row.some(value => value !== '')) rows.push(row);
      row=[];
    } else cell += c;
  }
  if (quoted) throw new Error('Unterminated quoted cell.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const rows = parseCsv(raw);
const columns = rows.shift();
if (!columns || columns.length !== 10 || columns[1] !== 'Code' ||
  columns[3] !== 'Scheme Type' || columns[7] !== 'Launch Date') {
  throw new Error('Expected ten-column AMFI manual scheme sheet.');
}
const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const codes = []; const known = new Set();
let openEnded=0,future=0,unknownLaunch=0;
for (const fields of rows) {
  if (fields.length !== 10 || !/^\d+$/.test(fields[1])) throw new Error('Invalid scheme row.');
  const code=Number(fields[1]);
  if (!Number.isSafeInteger(code) || code <= 0 || known.has(code)) throw new Error('Duplicate/invalid code.');
  known.add(code);
  if (fields[3] !== 'Open Ended') continue;
  openEnded++;
  const match=/^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(fields[7].trim());
  if (!match) { unknownLaunch++; continue; }
  const month=months[match[2]],day=Number(match[1]),year=Number(match[3]);
  if (!Number.isInteger(month)) throw new Error('Invalid launch month.');
  const launched = new Date(Date.UTC(year,month,day));
  if (launched.getUTCDate()!==day || launched.getUTCMonth()!==month || launched.getUTCFullYear()!==year)
    throw new Error('Invalid launch day.');
  if (launched.toISOString().slice(0,10)>asOf) { future++; continue; }
  codes.push(code);
}
codes.sort((a,b)=>a-b);
const note=[
  '/**',
  ' * Derived numeric scheme-code roster from manually supplied AMFI scheme sheet.',
  ' * Snapshot date: '+asOf+'. Source rows: '+rows.length+'; open-ended: '+openEnded+'; accepted: '+codes.length+'.',
  ' * Excludes '+future+' not-yet-launched schemes and '+unknownLaunch+' lacking a verified launch date.',
  ' * These IDs alone are NOT proof that new purchases are allowed.',
  ' * Never fetch AMFI data automatically. Confirm redistribution rights before public release.',
  ' * The original sheet, names, ISINs, and categories are intentionally NOT committed.',
  ' */',
  "export const AMFI_ROSTER_DATE = '"+asOf+"';",
  'export const AMFI_OPEN_ENDED_CODES: readonly number[] = [',
];
for(let i=0;i<codes.length;i+=18)note.push('  '+codes.slice(i,i+18).join(',')+(i+18<codes.length?',':''));
note.push('];');
await writeFile('src/lib/amfi-open-ended-roster.ts',note.join('\n')+'\n','utf8');
console.log(JSON.stringify({rows:rows.length,openEnded,accepted:codes.length,future,unknownLaunch}));
