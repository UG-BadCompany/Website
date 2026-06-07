export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"schedule.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"schedule", records:[] }, message:"Schedule handled by module API dispatcher." }); }
