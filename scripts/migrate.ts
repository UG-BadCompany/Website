import fs from 'node:fs/promises';
import path from 'node:path';
import { createDatabase } from '../lib/server/database';

const db = createDatabase();
const dir = path.resolve('migrations');
for (const file of (await fs.readdir(dir)).filter((f: string) => f.endsWith('.sql')).sort()) {
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  console.log(`Running ${file}`);
  await db.query(sql);
}
console.log('Migrations complete');
