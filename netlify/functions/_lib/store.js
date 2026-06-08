import fs from 'fs';
import path from 'path';
const statePath = '/tmp/bc-platform-installation.json';
export function readState(){try{return JSON.parse(fs.readFileSync(statePath,'utf8'))}catch{return {installation_complete:false,current_step:'welcome'}}}
export function writeState(data){const next={...readState(),...data,updated_at:new Date().toISOString()};fs.writeFileSync(statePath,JSON.stringify(next,null,2));return next}
export function json(body,statusCode=200){return {statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)}}
export function optionalWarnings(env=process.env){return [['OPENAI_API_KEY','OpenAI is not configured yet.'],['RESEND_API_KEY','Email is not configured yet.'],['SQUARE_ACCESS_TOKEN','Square payments are not configured yet.'],['SMTP_HOST','SMTP is not configured yet.'],['SERPAPI_KEY','SerpAPI is not configured yet.'],['LICENSE_VERIFY_URL','License server is not configured yet.']].filter(([key])=>!env[key]).map(([,msg])=>msg)}
export function discoverModules(){const dir=path.join(process.cwd(),'modules');try{return fs.readdirSync(dir,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>JSON.parse(fs.readFileSync(path.join(dir,d.name,'manifest.json'),'utf8'))).sort((a,b)=>(a.nav?.order??999)-(b.nav?.order??999))}catch{return []}}
