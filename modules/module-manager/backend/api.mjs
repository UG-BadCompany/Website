export const route={method:['GET','POST'],path:'/records',permission:'modules.manage'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'module-manager',records:[]},message:'Module Manager API healthy.'});}
