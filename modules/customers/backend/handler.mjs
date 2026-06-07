export const route = { method:["GET","POST","PATCH"], path:"/records", permission:"customers.view" };
export default async function handler(request, context) { return context.json(200, { ok:true, data:{ module:"customers", records:[] }, message:"Customers handled by module API dispatcher." }); }
