window.TAApi={
  async request(path,{method='GET',body,headers={}}={}){const res=await fetch(path,{method,headers:{'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined,credentials:'include'});let data={};try{data=await res.json()}catch{} if(!res.ok) throw Object.assign(new Error(data.message||'Request failed'),{status:res.status,data}); return data;},
  withQuery(path,params={}){const url=new URL(path,location.origin);Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,value)});return `${url.pathname}${url.search}`},
  get(p,params){return this.request(params?this.withQuery(p,params):p)},
  post(p,b){return this.request(p,{method:'POST',body:b})},
  patch(p,b){return this.request(p,{method:'PATCH',body:b})},
  delete(p,b){return this.request(p,{method:'DELETE',body:b})}
};
