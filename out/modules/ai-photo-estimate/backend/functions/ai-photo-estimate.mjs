export const route={method:['GET','POST'],path:'/records',permission:'ai-photo-estimate.view'};
export default async function handler(event,context){return context.json(200,{ok:true,data:{module:'ai-photo-estimate',method:event.httpMethod},message:'AI Photo Estimate API handled by module dispatcher.'});}
