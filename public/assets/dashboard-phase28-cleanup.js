// Phase 28 cleanup final polish
(()=> {
 if(window.__phase28CleanupLoaded)return;
 window.__phase28CleanupLoaded=true;
 const root=document.querySelector('[data-dashboard-root]');
 if(!root)return;

 const existing=document.querySelector('.phase-cleanup-note');
 if(existing)return;

 const note=document.createElement('section');
 note.className='phase-cleanup-note';
 note.innerHTML='<h2>Operations modules</h2><p>Advanced tools are grouped below: documentation, inventory, scheduling, and maintenance planning.</p>';

 const first=document.querySelector('.photo-doc-suite,.inventory-suite,.smart-schedule-suite,.maintenance-suite');
 if(first && first.parentNode){
   first.parentNode.insertBefore(note, first);
 }
})();