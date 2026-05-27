// Phase 27 AI maintenance plans
(()=> {
 if(window.__phase27Loaded)return;
 window.__phase27Loaded=true;

 const root=document.querySelector('[data-dashboard-root]');
 if(!root)return;

 const section=document.createElement('section');
 section.className='maintenance-suite';
 section.innerHTML=`
 <section class="maintenance-card">
   <span class="eyebrow">Phase 27</span>
   <h2>AI maintenance plans & recurring service</h2>
   <p>Prepare recurring service plans, preventative maintenance schedules, and long-term property upkeep automation.</p>

   <div class="maintenance-grid">

     <article class="maintenance-tile">
       <span class="maintenance-badge">HVAC</span>
       <h4>Seasonal maintenance</h4>
       <p>Prepare spring/summer AC tune-ups, filter reminders, condensate cleaning, and winter heating checks.</p>
     </article>

     <article class="maintenance-tile">
       <span class="maintenance-badge">Plumbing</span>
       <h4>Leak prevention</h4>
       <p>Track shutoff valves, supply lines, water heaters, and recurring drain cleaning intervals.</p>
     </article>

     <article class="maintenance-tile">
       <span class="maintenance-badge">Electrical</span>
       <h4>Safety inspection plans</h4>
       <p>Document GFCI testing, panel reviews, smoke detector checks, and lighting maintenance.</p>
     </article>

     <article class="maintenance-tile">
       <span class="maintenance-badge">Property Care</span>
       <h4>Property management plans</h4>
       <p>Support recurring maintenance for rentals, commercial spaces, and managed properties.</p>
     </article>

   </div>
 </section>`;
 const after=document.querySelector('.smart-schedule-suite') || root.firstElementChild;
 after.parentNode.insertBefore(section, after.nextSibling);
})();