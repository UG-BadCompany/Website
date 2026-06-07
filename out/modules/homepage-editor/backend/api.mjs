export const route={method:['GET','POST'],path:'/records',permission:'homepage.edit'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'homepage-editor',records:[]},message:'Homepage Editor API healthy.'});}
