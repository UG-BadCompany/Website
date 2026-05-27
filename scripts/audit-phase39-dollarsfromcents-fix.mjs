#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const js = readFileSync('public/assets/dashboard-phase2-upgrade.js', 'utf8');

if (!js.includes('const dollarsFromCents')) {
  console.error('dollarsFromCents helper missing');
  process.exit(1);
}

if (!js.includes('typeof dollarsFromCents')) {
  console.error('fallback guard missing');
  process.exit(1);
}

console.log('Phase39 dollarsFromCents fix audit passed');
