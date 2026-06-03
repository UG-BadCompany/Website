window.TAModules.register({
  id:'admin.ai-knowledge',role:'admin',title:'AI Knowledge',icon:'🤖',permissions:['ai.knowledge.manage'],
  async mount(ctx){
    return TAModuleKit.mount(ctx,{
      title:'AI Knowledge',icon:'🤖',
      description:'Trade intelligence library and AI research settings for estimate and troubleshooting context. Mini splits live inside HVAC.',
      endpoint:'/api/admin/ai-knowledge',recordPaths:['items'],
      tabs:[{label:'All',key:'all'},{label:'HVAC',key:'hvac'},{label:'Plumbing',key:'plumbing'},{label:'Electrical',key:'electrical'},{label:'Pending Review',key:'pending'}],
      metrics:[{label:'Knowledge Items',icon:'🤖'},{label:'Pending Review',icon:'📝',status:'pending_review'},{label:'Approved',icon:'✅',status:'approved'},{label:'Disabled',icon:'⛔',status:'disabled'}],
      actions:['Add Knowledge','Review Pending','Promote Standard','Open AI Settings'],recordActions:['View Knowledge','Approve','Reject','Promote','Disable'],
      onAction(action,{root,config,records}){
        if(action==='Open AI Settings'){
          TAModuleKit.openDetail(root,{...config,detailSections:['Research mode','Internal estimating playbook','Internal troubleshooting playbook','Live product research','Live material pricing research','Admin approval rules']},{title:'AI Settings',summary:'Default research mode: INTERNAL + LIVE RESEARCH. Options: OFF, INTERNAL KNOWLEDGE ONLY, INTERNAL + LIVE RESEARCH, LIVE RESEARCH AGGRESSIVE. OpenAI calls remain server-side and admin approval is always required.',notes:'Live research uses configured server-side providers such as SERPAPI_API_KEY when available; missing provider keys are reported instead of faking results.',status:'settings'});
          return;
        }
        TAModuleKit.openDetail(root,config,records[0]||{title:action});
      },
      secondary:[
        {icon:'🌡️',title:'HVAC includes mini splits',text:'Mini splits, split systems, heat pumps, package units, furnaces, air handlers, controls, ductwork, IAQ, condensate, filters, troubleshooting, maintenance, repair, replacement, and installation are handled under HVAC.'},
        {icon:'🔎',title:'Research modes',text:'OFF, INTERNAL KNOWLEDGE ONLY, INTERNAL + LIVE RESEARCH (default), and LIVE RESEARCH AGGRESSIVE are supported by the server payloads.'},
        {icon:'🛡️',title:'Server-side AI only',text:'OpenAI and live research provider keys are used only in Netlify Functions. Missing keys return real errors with manual fallback options.'}
      ]
    });
  },async destroy(){},async refresh(){}
});
