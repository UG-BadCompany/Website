export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"maintenance.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"maintenance-plans", records:[] }, message:"Maintenance Plans handled by module API dispatcher." }); }
