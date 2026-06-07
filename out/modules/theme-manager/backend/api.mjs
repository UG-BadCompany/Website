export const route={method:['GET','POST'],path:'/records',permission:'theme.manage'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'theme-manager',records:[]},message:'Theme Manager API healthy.'});}
