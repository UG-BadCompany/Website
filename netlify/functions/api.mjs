import crypto from 'node:crypto';

let dbDepsPromise;
let appDepsPromise;
let appDepsLoaded;
async function loadDbDeps(){
 if(!dbDepsPromise) dbDepsPromise=import('./shared/db.mjs');
 return dbDepsPromise;
}
async function loadAppDeps(){
 if(!appDepsPromise) appDepsPromise=Promise.all([
  loadDbDeps(),
  import('./shared/seed.mjs'),
  import('./shared/env-metadata.mjs'),
  import('./shared/core-data.mjs'),
  import('./shared/workflow.mjs')
 ]).then(([db,seed,env,core,workflow])=>{ appDepsLoaded={...db,...seed,...env,...core,...workflow}; return appDepsLoaded; });
 return appDepsPromise;
}
const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
const parse=(event)=> event.body ? JSON.parse(event.body) : {};
const clean=(r)=>JSON.parse(JSON.stringify(r));
const safeDatabaseMessage='Automatic database bootstrap failed. Installer can load in recovery mode.';
const netlifyDatabaseGuide=['Open the Netlify site dashboard for this deployment.','Go to Storage → Database (or Netlify Database).','Create a new database, or link an existing Netlify Database to this site.','Redeploy or retry after Netlify injects NETLIFY_DATABASE_URL.'];
function dbRequired(message='Netlify Database is not linked yet. Create or link Netlify Database, then retry bootstrap.', extra={}){ return {ok:false,installed:false,needsInstall:true,safeMode:true,code:'NETLIFY_DATABASE_REQUIRED',message,netlifyDatabaseDetected:false,guide:netlifyDatabaseGuide,...extra}; }
function dbUnavailable(message=safeDatabaseMessage, extra={}){ return {ok:false,installed:false,needsInstall:true,safeMode:true,code:'DATABASE_UNAVAILABLE',message,netlifyDatabaseDetected:true,guide:netlifyDatabaseGuide,...extra}; }
function validationFailed(message, missing=[], goToStep='review'){ return {ok:false,code:'INSTALL_VALIDATION_FAILED',message,missing,goToStep}; }
function isDatabaseError(error){ return error?.code==='NETLIFY_DATABASE_REQUIRED'||error?.code==='DATABASE_UNAVAILABLE'||error?.code==='DATABASE_DRIVER_MISSING'||error?.statusCode===503||/database|postgres|connection|pg|relation|schema|migration|module|import|package/i.test(error?.message||''); }
async function withDb(fn){ const { ensureSchema, sql }=await loadDbDeps(); await ensureSchema(); return fn(sql()); }
async function tryInstallDb(fn, failureBody){
 try{ return await withDb(fn); }catch(error){
  if(error?.code==='NETLIFY_DATABASE_REQUIRED') return json(200,{...dbRequired(undefined,{draft:failureBody.draft,goToStep:failureBody.goToStep}),databaseError:error.message});
  if(isDatabaseError(error)) return json(200,{...failureBody,code:failureBody.code||'DATABASE_UNAVAILABLE',databaseError:error.message});
  throw error;
 }
}
async function databaseHealth(){
 let deps;
 try{ deps=await loadDbDeps(); }catch(error){
  return {configured:false,reachable:false,driverPackage:'pg',driverLoaded:false,driverError:error.message,error:`Database support could not be loaded: ${error.message}`,env:[]};
 }
 const { ensureSchema, sql, getDatabaseUrl, databaseEnvStatus, databaseDriverPackage, loadDatabaseDriver }=deps;
 const configured=!!getDatabaseUrl();
 let driverLoaded=false;
 let driverError=null;
 try{ loadDatabaseDriver(); driverLoaded=true; }catch(error){ driverError=error.message; }
 if(!configured) return {configured:false,reachable:false,driverPackage:databaseDriverPackage,driverLoaded,driverError,error:`Netlify Database is not linked. Expected one of: ${databaseEnvStatus().map((item)=>item.key).join(', ')}.`,env:databaseEnvStatus(),requiresDatabase:true,guide:netlifyDatabaseGuide};
 if(!driverLoaded) return {configured:true,reachable:false,driverPackage:databaseDriverPackage,driverLoaded,driverError,error:driverError,env:databaseEnvStatus()};
 try{
  const migrations=await ensureSchema();
  const [row]=await sql()`select true as reachable`;
  return {configured:true,reachable:!!row?.reachable,driverPackage:databaseDriverPackage,driverLoaded,driverError:null,error:null,env:databaseEnvStatus(),migrations};
 }catch(error){
  return {configured:true,reachable:false,driverPackage:databaseDriverPackage,driverLoaded,driverError:null,error:error.message,env:databaseEnvStatus()};
 }
}
function pathOf(event){ return ('/'+(event.path||'').replace(/^\/\.netlify\/functions\/api/,'').replace(/^\/api/,'')).replace(/\/+/g,'/'); }
async function list(db, table, active=true){ const where= active ? ` where coalesce(status,'active') not in ('workflow.closed','workflow.archived','quote.accepted','invoice.paid')` : ''; return db.unsafe(`select * from ${table}${where} order by created_at desc limit 200`); }
async function createCrud(db, table, body, defaults={}){ const data={...defaults,...body}; const keys=Object.keys(data).filter(k=>data[k]!==undefined); const values=keys.map(k=>data[k]); const cols=keys.map(k=>`"${k}"`).join(','); const params=keys.map((_,i)=>`$${i+1}`).join(','); const rows=await db.unsafe(`insert into ${table}(${cols}) values(${params}) returning *`,values); await appDepsLoaded?.audit?.(`${table}.create`,{id:rows[0].id},table,rows[0].id); return rows[0]; }
async function updateCrud(db, table, id, body){ const keys=Object.keys(body).filter(k=>!['id','created_at','updated_at'].includes(k)); if(!keys.length) return (await db.unsafe(`select * from ${table} where id=$1`,[id]))[0]; const sets=keys.map((k,i)=>`"${k}"=$${i+1}`).join(','); const rows=await db.unsafe(`update ${table} set ${sets}, updated_at=now() where id=$${keys.length+1} returning *`,[...keys.map(k=>body[k]),id]); await appDepsLoaded?.audit?.(`${table}.update`,{id},table,id); return rows[0]; }
export const handler=async(event)=>{ try{
 const method=event.httpMethod; const path=pathOf(event);
 if(path==='/install-status') {
  const health=await databaseHealth();
  if(!health.reachable) return json(200,{...(health.requiresDatabase?dbRequired():dbUnavailable()),installation_complete:false,draft:{},completed_at:null,databaseConfigured:health.configured,databaseReachable:false,databaseError:health.error,driverPackage:health.driverPackage,driverLoaded:health.driverLoaded,driverError:health.driverError,env:health.env});
  const { sql }=await loadDbDeps();
  const db=sql();
  const rows=await db`select installation_complete, installer_draft, completed_at from platform_installation where id='default'`;
  const complete=!!rows[0]?.installation_complete;
  return json(200,{ok:true,installed:complete,needsInstall:!complete,installation_complete:complete,draft:rows[0]?.installer_draft||{},completed_at:rows[0]?.completed_at||null,databaseConfigured:true,databaseReachable:true,netlifyDatabaseDetected:true,driverPackage:health.driverPackage,driverLoaded:health.driverLoaded,env:health.env,migrations:health.migrations});
 }
 const { audit, seedPlatform, integrationStatus, modules, roles, permissions, transition, assertTransition }=await loadAppDeps();
 if(path==='/install/health') {
  const health=await databaseHealth();
  return json(200,{ok:health.reachable,code:health.reachable?'DATABASE_AVAILABLE':(health.requiresDatabase?'NETLIFY_DATABASE_REQUIRED':'DATABASE_UNAVAILABLE'),message:health.reachable?'Database is connected and pending migrations have been applied automatically.':(health.requiresDatabase?'Netlify Database is not linked yet. Create or link Netlify Database, then retry bootstrap.':safeDatabaseMessage),safeMode:!health.reachable,databaseConfigured:health.configured,databaseReachable:health.reachable,database:health.reachable,netlifyDatabaseDetected:health.configured,databaseError:health.error||null,driverPackage:health.driverPackage,driverLoaded:health.driverLoaded,driverError:health.driverError,env:health.env,guide:health.guide||netlifyDatabaseGuide,needsInstall:!health.reachable,migrations:health.migrations});
 }
 if(path==='/install/draft' && method==='GET') return await tryInstallDb(async db=>{ const rows=await db`select installer_draft from platform_installation where id='default'`; return json(200,{ok:true,draft:rows[0]?.installer_draft||{}}); }, dbUnavailable('Automatic bootstrap could not load installer draft.',{draft:{}}));
 if(path==='/install/draft' && method==='POST') return await tryInstallDb(async db=>{ const body=parse(event); await db`insert into platform_installation(id,installer_draft) values('default',${db.json(body)}) on conflict(id) do update set installer_draft=platform_installation.installer_draft || excluded.installer_draft, updated_at=now()`; return json(200,{ok:true,draft:body}); }, dbUnavailable('Automatic bootstrap could not save installer draft.'));
 if(['/install/integration-status','/system/integration-status','/install/env-status'].includes(path)) return json(200,{ok:true,integrations:integrationStatus(),variables:integrationStatus()});
 if(path==='/install/finish' && method==='POST') { const body=parse(event); const missing=[]; if(!body.owner?.email && !body.company?.email) missing.push('owner_account'); if(missing.length) return json(200,validationFailed('Owner account is missing.',missing,'owner')); return await tryInstallDb(async db=>{ await seedPlatform(db,body); const checks=await db`select (select count(*) from app_users) users,(select count(*) from roles) roles,(select count(*) from permissions) permissions,(select count(*) from role_permissions) role_permissions,(select count(*) from workspace_access) workspace_access,(select count(*) from module_registry) modules,(select count(*) from service_categories) service_categories,(select count(*) from company_settings where id='default') company_settings,(select count(*) from homepage_settings where id='default') homepage_settings,(select count(*) from theme_settings where id='default') theme_settings,(select installation_complete from platform_installation where id='default') complete`; const c=checks[0]; if(!c.complete||Number(c.company_settings)<1||Number(c.homepage_settings)<1||Number(c.theme_settings)<1||Number(c.users)<1||Number(c.roles)<5||Number(c.permissions)<25||Number(c.role_permissions)<25||Number(c.workspace_access)<5||Number(c.modules)<25||Number(c.service_categories)<8) return json(200,{ok:false,code:'INSTALL_VALIDATION_FAILED',message:'Install validation failed after database writes.',checks:c,goToStep:'review'}); return json(200,{ok:true,redirect:'/dashboard/',checks:c}); }, dbUnavailable('Automatic bootstrap failed while creating the platform.',{goToStep:'review'})); }
 if(path==='/bootstrap') return await withDb(async db=>{ const [company]=await db`select * from company_settings where id='default'`; const mods=await db`select * from module_registry where enabled=true order by group_name,label`; return json(200,{ok:true,company:company||null,modules:mods.length?mods:modules,roles:Object.keys(roles)}); });
 if(path==='/modules') return await withDb(async db=>json(200,{ok:true,modules:await db`select * from module_registry order by group_name,label`}));
 if(path==='/dashboard/summary') return await withDb(async db=>{ const [row]=await db`select (select count(*) from customers where status='active') customers,(select count(*) from estimate_requests where status not in ('workflow.closed','workflow.archived')) requests,(select count(*) from quotes where status not in ('quote.accepted','workflow.archived')) quotes,(select count(*) from work_orders where status not in ('workflow.closed','workflow.archived')) work_orders,(select count(*) from invoices where status not in ('invoice.paid','workflow.archived')) invoices_due,(select coalesce(sum(total-paid_total),0) from invoices where status <> 'invoice.paid') outstanding`; const activity=await db`select action, entity_type, created_at from audit_logs order by created_at desc limit 10`; return json(200,{ok:true,stats:row,activity,quickStart:['Create first client','Create first request','Create first quote','Schedule a work order','Send an invoice','Configure integrations']}); });
 if(path==='/auth/magic-link' && method==='POST') return await withDb(async db=>{ const {email}=parse(event); const normalized=String(email||'').trim().toLowerCase(); if(!normalized.includes('@')) return json(400,{ok:false,error:'Enter a valid email address.'}); const token=crypto.randomBytes(24).toString('hex'); const tokenHash=crypto.createHash('sha256').update(token).digest('hex'); await db`insert into magic_link_tokens(normalized_email, token_hash, expires_at) values(${normalized},${tokenHash},now()+interval '30 minutes')`; await audit('auth.magic_link.requested',{email:normalized,emailConfigured:Boolean(process.env.RESEND_API_KEY)}); return json(200,{ok:true,emailConfigured:Boolean(process.env.RESEND_API_KEY),message:process.env.RESEND_API_KEY?'Magic link queued.':'Email not configured yet. Use owner setup mode or configure Resend in System Center.',devLink:process.env.RESEND_API_KEY?undefined:`/login/?token=${token}&email=${encodeURIComponent(normalized)}`}); });
 if(path==='/auth/verify' && method==='POST') return await withDb(async db=>{ const {email,token}=parse(event); const normalized=String(email||'').trim().toLowerCase(); const tokenHash=crypto.createHash('sha256').update(String(token||'')).digest('hex'); const rows=await db`update magic_link_tokens set used_at=now() where normalized_email=${normalized} and token_hash=${tokenHash} and used_at is null and expires_at>now() returning id`; if(!rows.length) return json(401,{ok:false,error:'Expired or invalid login link.'}); let users=await db`select * from app_users where normalized_email=${normalized}`; if(!users.length) users=await db`insert into app_users(full_name,email,normalized_email,active) values(${normalized.split('@')[0]},${normalized},${normalized},true) returning *`; return json(200,{ok:true,user:users[0],session:{role:'client',expiresAt:new Date(Date.now()+86400000).toISOString()}}); });
 const parts=path.split('/').filter(Boolean);
 const resource=parts[0]; const id=parts[1]; const tableMap={customers:'customers',requests:'estimate_requests',quotes:'quotes','work-orders':'work_orders',inventory:'inventory_items',invoices:'invoices',payments:'payments',files:'files',users:'app_users',audit:'audit_logs'};
 if(tableMap[resource]) return await withDb(async db=>{ const table=tableMap[resource]; if(method==='GET'&&!id) return json(200,{ok:true,items:clean(await list(db,table,resource!=='audit'))}); if(method==='GET'&&id) return json(200,{ok:true,item:(await db.unsafe(`select * from ${table} where id=$1`,[id]))[0]||null}); if(method==='POST'&&!id){ const body=parse(event); let row; if(resource==='quotes' && body.request_id){ const req=(await db`select * from estimate_requests where id=${body.request_id}`)[0]; row=await createCrud(db,table,{...body,customer_id:body.customer_id||req?.customer_id,title:body.title||`Quote for ${req?.service_category||'Service'}`},{line_items:body.line_items||[]}); await transition(db,{entityType:'request',entityId:body.request_id,fromStatus:req.status,toStatus:'quote.draft'}); }
 else if(resource==='work-orders' && body.quote_id){ const q=(await db`select * from quotes where id=${body.quote_id}`)[0]; if(q?.status!=='quote.accepted') await transition(db,{entityType:'quote',entityId:body.quote_id,fromStatus:q.status,toStatus:'quote.accepted'}); row=await createCrud(db,table,{...body,customer_id:body.customer_id||q?.customer_id,title:body.title||q?.title||'Work Order'}); }
 else if(resource==='invoices' && body.work_order_id){ const wo=(await db`select * from work_orders where id=${body.work_order_id}`)[0]; row=await createCrud(db,table,{...body,customer_id:body.customer_id||wo?.customer_id,title:body.title||`Invoice: ${wo?.title||'Work'}`}); }
 else row=await createCrud(db,table,body); return json(201,{ok:true,item:clean(row)}); }
 if(method==='PATCH'&&id) return json(200,{ok:true,item:clean(await updateCrud(db,table,id,parse(event)))});
 if(method==='DELETE'&&id){ const status= resource==='customers'?'archived':'workflow.archived'; await db.unsafe(`update ${table} set status=$1, updated_at=now() where id=$2`,[status,id]); await audit(`${table}.archive`,{id},table,id); return json(200,{ok:true}); }
 });
 if(path==='/workflow/transition'&&method==='POST') return await withDb(async db=>{ const body=parse(event); const current=(await db.unsafe(`select status from ${({request:'estimate_requests',quote:'quotes',work_order:'work_orders',invoice:'invoices'}[body.entityType])} where id=$1`,[body.entityId]))[0]; assertTransition(current.status,body.toStatus); await transition(db,{...body,fromStatus:current.status}); return json(200,{ok:true}); });
 if(path==='/ai/run'&&method==='POST') return json(200,{ok:!!process.env.OPENAI_API_KEY,configured:!!process.env.OPENAI_API_KEY,message:process.env.OPENAI_API_KEY?'AI request accepted.':'AI is not configured yet. Configure OpenAI in System Center → Environment & Integrations.'});
 if(path==='/health') return await withDb(async db=>{ const [counts]=await db`select (select count(*) from module_registry) modules,(select count(*) from roles) roles,(select count(*) from permissions) permissions`; return json(200,{ok:true,database:true,counts,integrations:integrationStatus().map(i=>({key:i.key,configured:i.configured,category:i.category}))}); });
 return json(404,{ok:false,error:'API route not found',path});
 }catch(err){ const path=pathOf(event); if(path.startsWith('/install')||path==='/install-status') return json(200,{ok:false,code:err?.code==='NETLIFY_DATABASE_REQUIRED'?'NETLIFY_DATABASE_REQUIRED':(isDatabaseError(err)?'DATABASE_UNAVAILABLE':'INSTALL_API_ERROR'),message:err?.code==='NETLIFY_DATABASE_REQUIRED'?'Netlify Database is not linked yet. Create or link Netlify Database, then retry bootstrap.':(isDatabaseError(err)?safeDatabaseMessage:(err.message||'Unexpected installer API error')),safeMode:true,guide:netlifyDatabaseGuide,databaseError:isDatabaseError(err)?err.message:undefined}); return json(err.statusCode||500,{ok:false,error:err.message||'Unexpected error'}); }};
