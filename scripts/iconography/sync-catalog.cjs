#!/usr/bin/env node
// Пересобирает public/iconography/catalog.json из паспортов records/*.json.
// Паспорт — источник истины для полей индекса; порядок записей сохраняется по текущему catalog.json.
const { readFileSync, writeFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const base = resolve(__dirname, '../../public/iconography');
const FIELDS = ['id', 'title', 'tradition', 'region', 'period', 'centuries', 'subject', 'people', 'type', 'museum', 'tags', 'image', 'recognitionGroup', 'schoolId'];
const current = JSON.parse(readFileSync(resolve(base, 'catalog.json'), 'utf8'));
const order = new Map(current.map((x, i) => [x.id, i]));
const records = readdirSync(resolve(base, 'records')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(resolve(base, 'records', f), 'utf8')));
records.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
const next = records.map((r) => Object.fromEntries(FIELDS.filter((k) => r[k] !== undefined).map((k) => [k, r[k]])));
writeFileSync(resolve(base, 'catalog.json'), JSON.stringify(next));
console.log(`catalog.json: ${next.length} записей, в викторине ${next.filter((x) => x.recognitionGroup).length}`);
