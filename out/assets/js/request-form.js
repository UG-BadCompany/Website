(() => {
  const bindWizard = () => {
    document.querySelectorAll('.estimate-wizard').forEach((form) => {
      if (form.dataset.wizardBound === '1') return;
      form.dataset.wizardBound = '1';
      const stages = [...form.querySelectorAll('[data-wizard-stage]')];
      const jumps = [...form.querySelectorAll('[data-wizard-jump]')];
      const prev = form.querySelector('[data-wizard-prev]');
      const next = form.querySelector('[data-wizard-next]');
      let current = 0;
      const show = (index) => {
        current = Math.max(0, Math.min(index, stages.length - 1));
        stages.forEach((stage, stageIndex) => { stage.hidden = stageIndex !== current; });
        jumps.forEach((jump, jumpIndex) => {
          jump.classList.toggle('active', jumpIndex === current);
          jump.classList.toggle('complete', jumpIndex < current);
        });
        if (prev) prev.hidden = current === 0;
        if (next) next.hidden = current === stages.length - 1;
        form.style.setProperty('--wizard-progress', `${((current + 1) / stages.length) * 100}%`);
      };
      jumps.forEach((jump) => jump.addEventListener('click', () => show(Number(jump.dataset.wizardJump) || 0)));
      prev?.addEventListener('click', () => show(current - 1));
      next?.addEventListener('click', () => show(current + 1));
      show(0);
    });
  };
  window.TAEstimateWizard = { bind: bindWizard };
  document.addEventListener('DOMContentLoaded', bindWizard);
  document.addEventListener('ta:homepage-rendered', bindWizard);
})();

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
