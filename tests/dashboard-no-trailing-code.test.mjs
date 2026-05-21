import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = ['public/dashboard/index.html', 'out/dashboard/index.html'];

for (const file of files) {
  test(`${file} has no trailing rendered code after </html>`, () => {
    const content = readFileSync(file, 'utf8');
    const endIndex = content.lastIndexOf('</html>');
    assert.ok(endIndex >= 0, 'missing </html>');
    const trailing = content.slice(endIndex + 7).trim();
    assert.equal(trailing, '', `unexpected trailing content: ${trailing.slice(0, 120)}`);
  });
}
