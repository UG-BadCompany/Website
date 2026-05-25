import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, toObjects } from '../scripts/import-estimate-playbook.mjs';

test('parseCsv handles quoted commas and multiline rows', () => {
  const csv = 'Name,Notes\n"Mini Split","Needs 240V, breaker"\n"Paint","Line1\nLine2"\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][1], 'Needs 240V, breaker');
  assert.equal(rows[2][1], 'Line1\nLine2');
});

test('toObjects maps headers and skips blank rows', () => {
  const rows = [
    ['A', 'B'],
    ['1', '2'],
    ['', ''],
  ];
  const objects = toObjects(rows);
  assert.equal(objects.length, 1);
  assert.deepEqual(objects[0].row_payload, { A: '1', B: '2' });
});
