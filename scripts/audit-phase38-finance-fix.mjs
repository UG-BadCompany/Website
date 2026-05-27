#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const js = readFileSync('public/assets/dashboard-phase4-finance.js', 'utf8');

if (!js.includes('safeInvoices')) {
  console.error('safeInvoices guard missing');
  process.exit(1);
}

if (!js.includes('Phase 38 finance fix')) {
  console.error('phase38 marker missing');
  process.exit(1);
}

console.log('Phase38 finance fix audit passed');
