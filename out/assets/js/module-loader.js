(()=>{
  const registry=new Map(),loadedIds=new Set(),loadedBases=new Set();
  window.TAModules={
    register(m){registry.set(m.id,m)},
    get:id=>registry.get(id),
    all:()=>[...registry.values()],
    async load(def){
      const registeredId=def.registerId||def.id;
      if(loadedIds.has(def.id))return registry.get(def.id)||registry.get(registeredId);
      await Promise.all([
        fetch(def.base+'/module.html').then(r=>r.text()).then(h=>def.html=h).catch(()=>def.html=''),
        loadedBases.has(def.base+':css')?Promise.resolve():new Promise((res)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=def.base+'/module.css';l.onload=res;l.onerror=res;document.head.appendChild(l);loadedBases.add(def.base+':css')}),
        loadedBases.has(def.base+':js')?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=def.base+'/module.js';s.onload=res;s.onerror=rej;document.body.appendChild(s);loadedBases.add(def.base+':js')})
      ]);
      loadedIds.add(def.id);
      return registry.get(def.id)||registry.get(registeredId);
    }
  }
})();
