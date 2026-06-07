export const route={method:['GET','POST'],path:'/records',permission:'finance.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'finance',records:[]},message:'Finance API healthy.'});}
