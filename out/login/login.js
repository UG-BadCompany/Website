(async()=>{
  if(!await TACompany.requireInstalled())return;
  await TACompany.load();
  document.getElementById('login-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const s=document.getElementById('login-status');
    if(s){s.textContent='Sending secure link...';s.dataset.tone='';}
    try{
      await TAAuth.login(new FormData(e.currentTarget).get('email'));
      if(s){s.textContent='Check your email for your secure sign-in link.';s.dataset.tone='success';}
    }catch(err){
      if(s){s.textContent=err.message||'Unable to send link.';s.dataset.tone='error';}
    }
  });
})();
