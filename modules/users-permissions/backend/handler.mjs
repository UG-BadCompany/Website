export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"users.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"users-permissions", records:[] }, message:"Users & Permissions handled by module API dispatcher." }); }
