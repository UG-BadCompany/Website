import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = ['public/dashboard/index.html', 'out/dashboard/index.html'];

for (const file of files) {
  test(`${file} inventory workspace functions live inside <script>`, () => {
    const html = readFileSync(file, 'utf8');
    const marker = 'const renderAdminInventoryWorkspace = () => {';
    const idx = html.indexOf(marker);
    assert.ok(idx > -1, 'inventory render function missing');

    const scriptOpen = html.lastIndexOf('<script', idx);
    const scriptClose = html.indexOf('</script>', idx);
    assert.ok(scriptOpen > -1, 'no opening <script> before inventory function');
    assert.ok(scriptClose > -1, 'no closing </script> after inventory function');

    const bodyClose = html.indexOf('</body>');
    assert.ok(scriptClose < bodyClose, 'inventory function appears outside script/body structure');
  });
}
