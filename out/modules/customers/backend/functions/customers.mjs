export const route={method:['GET','POST'],path:'/records',permission:'customers.view'};
export default async function handler(event,context){return context.json(200,{ok:true,data:{module:'customers',method:event.httpMethod},message:'Customers API handled by module dispatcher.'});}
