// Phase 25 inventory and company assets
(()=> {
 if(window.__phase25Loaded)return;
 window.__phase25Loaded=true;
 const root=document.querySelector('[data-dashboard-root]');
 if(!root)return;

 const section=document.createElement('section');
 section.className='inventory-suite';
 section.dataset.sidebarWorkspaceSection='settings';
 section.innerHTML=`
 <section class="inventory-card">
   <span class="eyebrow">Phase 25</span>
   <h2>Inventory & company asset tracking</h2>
   <p>Foundation for tracking stocked parts, worker tools, consumables, and vehicle inventory.</p>

   <div class="inventory-grid">
     <article class="inventory-tile">
       <span class="inventory-pill">Warehouse</span>
       <h4>Stocked materials</h4>
       <p>Track commonly used items like breakers, wire, fittings, disconnects, supply lines, and HVAC accessories.</p>
     </article>

     <article class="inventory-tile">
       <span class="inventory-pill">Worker tools</span>
       <h4>Assigned equipment</h4>
       <p>Document ladders, meters, vacuums, recovery machines, specialty tools, and serialized equipment.</p>
     </article>

     <article class="inventory-tile">
       <span class="inventory-pill">Vehicles</span>
       <h4>Truck inventory</h4>
       <p>Track consumables, emergency stock, and vehicle-specific parts kits for faster dispatch.</p>
     </article>

     <article class="inventory-tile">
       <span class="inventory-pill">Purchasing</span>
       <h4>Material replenishment</h4>
       <p>Prepare low-stock alerts and supplier restock planning tied to quote usage history.</p>
     </article>
   </div>
 </section>`;
 const after=document.querySelector('.photo-doc-suite') || root.firstElementChild;
 after.parentNode.insertBefore(section, after.nextSibling);
})();