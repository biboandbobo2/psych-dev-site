#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const csvPath = path.resolve('public/content/periods.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

const rows = parsed.data.filter(Boolean);
const videoRows = rows.filter((row) => row.section_id === 'video' && row.content_type === 'object');

async function check(url) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  );
  return res.ok;
}

const report = [];
for (const row of videoRows) {
  try {
    const payload = JSON.parse(row.content_value);
    const url = payload?.url?.trim?.();
    if (!url) {
      report.push({ period: row.period_id, url: null, ok: false, reason: 'empty url' });
      continue;
    }
    const ok = await check(url);
    report.push({ period: row.period_id, url, ok, reason: ok ? 'ok' : 'blocked/unavailable' });
  } catch (error) {
    report.push({ period: row.period_id, url: null, ok: false, reason: 'bad JSON' });
  }
}

console.table(report);
