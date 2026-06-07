export const route={method:['GET','POST'],path:'/records',permission:'reports.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'reports',records:[]},message:'Reports API healthy.'});}
