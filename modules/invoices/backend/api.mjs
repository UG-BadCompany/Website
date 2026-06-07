export const route={method:['GET','POST'],path:'/records',permission:'invoices.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'invoices',records:[]},message:'Invoices API healthy.'});}
