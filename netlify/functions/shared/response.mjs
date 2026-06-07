export function json(statusCode, body, headers={}){return {statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers},body:JSON.stringify(body)}}
export async function bodyJson(event){try{return event.body?JSON.parse(event.body):{}}catch{return {}}}
