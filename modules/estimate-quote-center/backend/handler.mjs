export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"quotes.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"estimate-quote-center", records:[] }, message:"Estimate & Quote Center handled by module API dispatcher." }); }
