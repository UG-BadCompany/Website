const memory=globalThis.__CMMS_STORE__ ||= {installed:false,installDraft:null,workflow:[],aiRuns:[],modules:{},payments:[]};
export const store=memory;
export async function getInstallation(){return {installed:store.installed, draft:store.installDraft, completedAt:store.completedAt||null}}
export async function saveInstallation(payload){store.installDraft=payload;store.installed=true;store.completedAt=new Date().toISOString();return getInstallation()}
export function seedWorkflow(){if(!store.workflow.length){store.workflow=[{id:'REQ-1001',state:'Request',active:true},{id:'Q-1002',state:'Admin Review',active:true},{id:'WO-1003',state:'In Progress',active:true},{id:'INV-1004',state:'Payment',active:true}]};return store.workflow}
