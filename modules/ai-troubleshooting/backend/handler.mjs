export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"ai.troubleshooting.use" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"ai-troubleshooting", records:[] }, message:"AI Troubleshooting handled by module API dispatcher." }); }
