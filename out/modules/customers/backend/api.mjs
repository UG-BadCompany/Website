export const route={method:['GET','POST'],path:'/records',permission:'customers.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'customers',records:[]},message:'Customers API healthy.'});}
