export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"homepage.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"homepage-editor", records:[] }, message:"Homepage Editor handled by module API dispatcher." }); }
