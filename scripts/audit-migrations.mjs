import { readFile } from 'node:fs/promises';
const sql=await readFile('netlify/database/migrations/0001_core_platform.sql','utf8');
for(const table of ['platform_settings','companies','users','roles','modules','audit_logs','workflow_items']) if(!sql.includes(table)) throw new Error(`Missing ${table}`);
console.log('Audited migrations');
