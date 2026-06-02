import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeEstimateIntake, TRADE_INTELLIGENCE_LIBRARY } from '../netlify/functions/estimate-intake-intelligence.mjs';

test('smart estimate intake never blocks low-information customer submissions', () => {
  const intake = analyzeEstimateIntake({ description: '', service: '', workScope: '' });

  assert.equal(intake.quoteCreationBlocked, false);
  assert.equal(intake.adminOverrideAlwaysAvailable, true);
  assert.equal(intake.manualEstimateModeAvailable, true);
  assert.equal(intake.optionalQuestions.every((question) => question.optional), true);
  assert.match(intake.optionalCollectionMessage, /Skip anything/i);
});

test('trade intelligence detects mini split preferences and optional questions', () => {
  const intake = analyzeEstimateIntake({
    service: 'Mini Split Installation',
    description: 'I want Mitsubishi and the most energy efficient option. Outdoor unit is around 40 ft away.',
    photosProvided: true,
  });

  assert.equal(intake.trade.key, 'mini_splits');
  assert.equal(intake.customerPreferences.preferredBrand.toLowerCase(), 'mitsubishi');
  assert.equal(intake.photoIntelligence.photosProvided, true);
  assert.equal(intake.optionalQuestions.some((question) => /BTU|Voltage|Distance/i.test(question.label)), true);
});

test('permanent trade library covers required phase 15 trades', () => {
  const requiredTrades = [
    'hvac', 'mini_splits', 'commercial_hvac', 'water_heaters', 'plumbing', 'commercial_plumbing',
    'electrical', 'commercial_electrical', 'roofing', 'drywall', 'painting', 'flooring', 'doors',
    'windows', 'appliances', 'handyman', 'general_contracting', 'facilities_maintenance',
    'property_maintenance', 'tenant_improvements',
  ];

  for (const trade of requiredTrades) {
    assert.ok(TRADE_INTELLIGENCE_LIBRARY[trade], `${trade} exists`);
    assert.ok(TRADE_INTELLIGENCE_LIBRARY[trade].questions.length >= 10, `${trade} has optional questions`);
    assert.ok(TRADE_INTELLIGENCE_LIBRARY[trade].rules.length >= 40, `${trade} has rule library entries`);
  }
});
