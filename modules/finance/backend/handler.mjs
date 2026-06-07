export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"finance.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"finance", records:[] }, message:"Finance handled by module API dispatcher." }); }
