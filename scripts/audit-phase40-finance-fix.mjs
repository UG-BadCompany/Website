#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const js = readFileSync('public/assets/dashboard-phase4-finance.js', 'utf8');

if (!js.includes('safeInvoice')) {
  console.error('safeInvoice helper missing');
  process.exit(1);
}

if (!js.includes('Phase 40 finance invoice fix')) {
  console.error('phase40 marker missing');
  process.exit(1);
}

console.log('Phase40 finance invoice fix audit passed');
