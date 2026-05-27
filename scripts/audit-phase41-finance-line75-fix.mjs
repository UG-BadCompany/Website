#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const js = readFileSync('public/assets/dashboard-phase4-finance.js', 'utf8');

if (js.includes('renderPaymentPlan(invoice.paymentPlan')) {
  console.error('Static renderPaymentPlan(invoice.paymentPlan) reference still exists');
  process.exit(1);
}

if (!js.includes('const renderPaymentPlan')) {
  console.error('renderPaymentPlan helper missing');
  process.exit(1);
}

const lines = js.split('\n');
const badLine = lines.findIndex((line, index) => index < 100 && line.includes('invoice.'));
if (badLine !== -1) {
  console.error(`invoice reference still exists in early mount block at line ${badLine + 1}`);
  process.exit(1);
}

console.log('Phase41 finance line75 fix audit passed');
