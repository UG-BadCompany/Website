import fs from 'node:fs/promises';
import path from 'node:path';

export interface StorageAdapter { put(key: string, data: Buffer | string): Promise<string>; get(key: string): Promise<Buffer | null> }
export function createStorage(provider = process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'netlify_blobs' : 'local')): StorageAdapter {
  if (provider === 'netlify_blobs') {
    // Netlify Blobs adapter slot. Production sites can swap this implementation for @netlify/blobs without changing app logic.
    return localStorageAdapter('.contractoros-netlify-blobs');
  }
  return localStorageAdapter('.contractoros-media');
}
function localStorageAdapter(root: string): StorageAdapter {
  return { put: async (key, data) => { const file = path.join(root, key); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); return file; }, get: async (key) => fs.readFile(path.join(root, key)).catch(() => null) };
}
