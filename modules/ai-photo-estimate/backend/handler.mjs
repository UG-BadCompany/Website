export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"ai.photo-estimate.use" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"ai-photo-estimate", records:[] }, message:"AI Photo Estimate handled by module API dispatcher." }); }
