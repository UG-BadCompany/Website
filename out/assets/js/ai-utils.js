window.TAAI={
  quote:async(payload)=>{const response=await TAApi.post('/.netlify/functions/ai-quote',payload);if(response?.result&&window.TAQuotes?.normalizeAiDraft)response.result=TAQuotes.normalizeAiDraft(response.result);return response},
  draftQuote:async(payload)=>{const response=await TAApi.post('/api/admin/quote-draft',{...payload,fast:true});if(response?.draft&&window.TAQuotes?.normalizeAiDraft)response.draft=TAQuotes.normalizeAiDraft(response.draft);if(response?.result&&window.TAQuotes?.normalizeAiDraft)response.result=TAQuotes.normalizeAiDraft(response.result);return response},
  recalculateQuote:(payload)=>TAAI.draftQuote({...payload,recalculate:true}),
  troubleshoot:(payload)=>TAApi.post('/.netlify/functions/ai-troubleshooting',payload),
  workerTroubleshoot:(payload)=>TAApi.post('/api/worker/ai-troubleshooting',payload)
};
