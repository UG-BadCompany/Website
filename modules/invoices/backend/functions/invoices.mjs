export const route={method:['GET','POST'],path:'/records',permission:'invoices.view'};
export default async function handler(event,context){return context.json(200,{ok:true,data:{module:'invoices',method:event.httpMethod},message:'Invoices & Payments API handled by module dispatcher.'});}
