export const route={method:['GET','POST'],path:'/records',permission:'permissions.manage'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'workspace-permissions',records:[]},message:'Workspace & Permissions API healthy.'});}
