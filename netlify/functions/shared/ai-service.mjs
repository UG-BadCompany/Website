export async function runAiTask({ mode, input }) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, optionalIntegrationMissing: true, mode, message: 'OpenAI is not configured. Configure it later in System Center → Environment & Integrations.' };
  }
  return { ok: true, mode, model: process.env.OPENAI_MODEL || 'gpt-5.5', inputSummary: input ? 'input_received' : 'empty' };
}
