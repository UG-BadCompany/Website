export const route={method:['GET','POST'],path:'/records',permission:'work-orders.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'work-orders',records:[]},message:'Work Orders API healthy.'});}
