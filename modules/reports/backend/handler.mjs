export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"reports.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"reports", records:[] }, message:"Reports handled by module API dispatcher." }); }
