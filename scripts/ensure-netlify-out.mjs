import fs from 'fs';
for (const file of ['out/index.html','out/install/index.html','out/install/recovery/index.html','out/config/bootstrap.json']) {
  if (!fs.existsSync(file)) throw new Error(`Missing build output ${file}`);
}
console.log('Static output directory verified.');
