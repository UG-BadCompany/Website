export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"modules.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"module-manager", records:[] }, message:"Module Manager handled by module API dispatcher." }); }
