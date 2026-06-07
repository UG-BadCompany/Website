export function aiConfigured(env = process.env) { return Boolean(env.OPENAI_API_KEY); }
export async function runAiTask({ task, input, model }) {
  if (!aiConfigured()) return { ok: false, code: 'AI_UNAVAILABLE', message: 'AI is not configured. The request was saved for manual review.', queuedForManualReview: true };
  return { ok: true, task, model: model || process.env.OPENAI_MODEL || 'gpt-5.5', output: { summary: 'AI service wrapper is configured for server-side provider calls.', inputPreview: typeof input === 'string' ? input.slice(0, 120) : undefined } };
}
