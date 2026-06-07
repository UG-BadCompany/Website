export const route={method:['GET','POST'],path:'/records',permission:'ai-photo-estimate.use'};
export default async function handler(request,context){return context.json(200,{ok:true,data:{module:'ai-photo-estimate',records:[]},message:'AI Photo Estimate API healthy.'});}
