(async()=>{
  if(!await TACompany.requireInstalled())return;
  await TACompany.load();
  const bind=()=>{
    const form=document.getElementById('request-form');
    if(!form||form.dataset.bound==='1')return;
    form.dataset.bound='1';
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const status=document.getElementById('request-status');
      if(status) { status.textContent='Sending your request securely…'; status.dataset.tone='pending'; }
      try{
        const data=await TAApi.post('/api/job-requests',TAForms.values(e.currentTarget));
        const id=data.requestId||data.id||data.jobRequest?.id||'';
        if(status) { status.textContent='Request received. Opening your next steps…'; status.dataset.tone='success'; }
        location.href='/thank-you/'+(id?'?request='+encodeURIComponent(id):'')
      }catch(err){
        if(status) { status.textContent=err.message||'We could not submit the request. Please call us or try again.'; status.dataset.tone='error'; }
      }
    });
  };
  bind();
  document.addEventListener('ta:homepage-rendered',bind);
})();
