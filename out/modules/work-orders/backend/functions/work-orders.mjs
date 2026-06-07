export const route={method:['GET','POST'],path:'/records',permission:'work-orders.view'};
export default async function handler(event,context){return context.json(200,{ok:true,data:{module:'work-orders',method:event.httpMethod},message:'Work Orders API handled by module dispatcher.'});}
