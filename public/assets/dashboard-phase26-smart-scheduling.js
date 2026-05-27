// Phase 26 smart scheduling + dispatch planner
(()=> {
 if(window.__phase26Loaded)return;
 window.__phase26Loaded=true;

 const root=document.querySelector('[data-dashboard-root]');
 if(!root)return;

 const section=document.createElement('section');
 section.className='smart-schedule-suite';
 section.innerHTML=`
 <section class="smart-schedule-card">
   <span class="eyebrow">Phase 26</span>
   <h2>Smart scheduling & dispatch planning</h2>
   <p>AI-assisted scheduling guidance for routing workers, grouping jobs, and reducing drive time.</p>

   <div class="smart-schedule-grid">

     <article class="smart-schedule-tile">
       <span class="smart-priority">Route Optimization</span>
       <h4>Grouped service areas</h4>
       <p>Prepare future grouped scheduling by city/zip to reduce windshield time and fuel cost.</p>
     </article>

     <article class="smart-schedule-tile">
       <span class="smart-priority warn">Priority Dispatch</span>
       <h4>Urgent job stacking</h4>
       <p>Highlight same-day HVAC, electrical, leak, or safety-related jobs before standard maintenance work.</p>
     </article>

     <article class="smart-schedule-tile">
       <span class="smart-priority">Worker utilization</span>
       <h4>Balanced scheduling</h4>
       <p>Spread installs, troubleshooting, and callbacks to avoid overloaded workers and overtime risk.</p>
     </article>

     <article class="smart-schedule-tile">
       <span class="smart-priority hot">Escalation review</span>
       <h4>Overdue jobs</h4>
       <p>Flag stale work orders, blocked jobs, missing parts, or delayed approvals before customers complain.</p>
     </article>

   </div>
 </section>`;
 const after=document.querySelector('.inventory-suite') || root.firstElementChild;
 after.parentNode.insertBefore(section, after.nextSibling);
})();