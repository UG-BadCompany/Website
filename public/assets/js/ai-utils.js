window.TAAI={
  quote:(payload)=>TAApi.post('/.netlify/functions/ai-quote',payload),
  draftQuote:(payload)=>TAApi.post('/api/admin/quote-draft',payload),
  troubleshoot:(payload)=>TAApi.post('/.netlify/functions/ai-troubleshooting',payload),
  workerTroubleshoot:(payload)=>TAApi.post('/api/worker/ai-troubleshooting',payload)
};
