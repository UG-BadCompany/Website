import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const preferredRoot = path.join(process.cwd(), 'out');
const fallbackRoot = path.join(process.cwd(), 'public');
const root = existsSync(path.join(preferredRoot, 'index.html')) ? preferredRoot : fallbackRoot;
const port = Number(process.env.PORT || 3000);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp']
]);

if (!existsSync(path.join(root, 'index.html'))) {
  console.error('Missing site entrypoint. Run npm run build or confirm public/index.html exists.');
  process.exit(1);
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const safePath = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': types.get(path.extname(filePath)) || 'application/octet-stream' });
    response.end(body);
  } catch {
    const body = await readFile(path.join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(body);
  }
}).listen(port, () => {
  console.log(`T&A Contracting site available at http://localhost:${port} from ${path.relative(process.cwd(), root)}`);
});
