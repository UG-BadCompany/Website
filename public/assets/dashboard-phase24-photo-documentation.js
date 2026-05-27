// Phase 24 photo/documentation center
(()=> {
 if(window.__phase24Loaded)return;
 window.__phase24Loaded=true;
 const root=document.querySelector('[data-dashboard-root]');
 if(!root)return;

 const wrap=document.createElement('section');
 wrap.className='photo-doc-suite';
 wrap.innerHTML=`
 <section class="photo-doc-card">
   <span class="eyebrow">Phase 24</span>
   <h2>Photo & documentation workflow</h2>
   <p>Standardized before/after photo capture and completion evidence guidance.</p>
   <div class="photo-doc-grid">
     <article class="photo-doc-tile">
       <h4>Before photos</h4>
       <p>Capture overall area, existing damage, serial/model tags, and access conditions.</p>
     </article>
     <article class="photo-doc-tile">
       <h4>Progress updates</h4>
       <p>Document hidden conditions, additional damage, and material changes.</p>
     </article>
     <article class="photo-doc-tile">
       <h4>Completion proof</h4>
       <p>Store final photos, testing verification, customer walkthrough, and cleanup confirmation.</p>
     </article>
     <article class="photo-doc-tile">
       <h4>Admin review</h4>
       <p>Admins can verify evidence before invoice closeout and worker completion approval.</p>
     </article>
   </div>
 </section>`;
 const after=document.querySelector('[data-phase23-customer-experience]') || root.firstElementChild;
 after.parentNode.insertBefore(wrap, after.nextSibling);
})();