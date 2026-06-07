const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

async function getStore(name) {
  try {
    const blobs = await import('@netlify/blobs');
    if (blobs?.getStore) return blobs.getStore(name);
  } catch {}
  return null;
}

export const handler = async (event) => {
  const key = new URLSearchParams(event.rawQuery || '').get('key') || '';
  if (!key || key.includes('..')) return json(404, { ok: false, message: 'Photo not found.' });
  const store = await getStore('job-request-uploads');
  if (!store) return json(404, { ok: false, message: 'Photo storage unavailable.' });
  const record = await store.get(key, { type: 'json' }).catch(() => null);
  if (!record?.dataUrl) return json(404, { ok: false, message: 'Photo not found.' });
  const match = /^data:([^;]+);base64,(.*)$/s.exec(record.dataUrl);
  if (!match) return json(415, { ok: false, message: 'Stored photo format is invalid.' });
  return {
    statusCode: 200,
    headers: {
      'content-type': record.mimeType || match[1] || 'application/octet-stream',
      'cache-control': 'private, max-age=300',
      'content-disposition': `inline; filename="${String(record.fileName || 'photo').replace(/\"/g, '')}"`,
    },
    isBase64Encoded: true,
    body: match[2],
  };
};

export default handler;
