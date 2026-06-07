export const route={method:['GET','POST'],path:'/records',permission:'quote-center.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'quote-center',records:[]},message:'Estimate & Quote Center API healthy.'});}
