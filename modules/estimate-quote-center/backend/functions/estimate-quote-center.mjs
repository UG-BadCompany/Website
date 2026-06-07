export const route={method:['GET','POST'],path:'/records',permission:'estimate-quote-center.view'};
export default async function handler(event,context){return context.json(200,{ok:true,data:{module:'estimate-quote-center',method:event.httpMethod},message:'Estimate & Quote Center API handled by module dispatcher.'});}
