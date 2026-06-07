export const route={method:['GET','POST'],path:'/records',permission:'scheduling.view'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'scheduling',records:[]},message:'Scheduling API healthy.'});}
