export const route={method:['GET','POST'],path:'/records',permission:'users.manage'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'users-company',records:[]},message:'Users / Company Management API healthy.'});}
