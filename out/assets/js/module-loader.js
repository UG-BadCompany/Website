(()=>{
  const registry=new Map(),loadedIds=new Set(),loadedBases=new Set();
  const normalizeModule=(mod,def)=>{
    if(!mod) return null;
    if(typeof mod.mount==='function') return mod;
    if(typeof mod.default?.mount==='function') return mod.default;
    if(typeof mod.default==='function') return {id:def.registerId||def.id,mount:mod.default};
    return null;
  };
  window.TAModules={
    register(m){if(m?.id) registry.set(m.id,m)},
    get:id=>registry.get(id),
    all:()=>[...registry.values()],
    async load(def){
      const registeredId=def.registerId||def.id;
      if(loadedIds.has(def.id)||loadedIds.has(registeredId)){
        const cached=registry.get(def.id)||registry.get(registeredId);
        if(cached?.mount) return cached;
      }
      const htmlPromise=fetch(def.base+'/module.html').then(r=>r.ok?r.text():'').then(h=>{def.html=h}).catch(()=>{def.html=''});
      const cssPromise=loadedBases.has(def.base+':css')?Promise.resolve():new Promise((res)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=def.base+'/module.css';l.onload=res;l.onerror=res;document.head.appendChild(l);loadedBases.add(def.base+':css')});
      const jsPromise=loadedBases.has(def.base+':js')?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=def.base+'/module.js';s.onload=()=>{loadedBases.add(def.base+':js');res()};s.onerror=()=>rej(new Error(`Module script missing or failed to load: ${def.base}/module.js`));document.body.appendChild(s)});
      await Promise.all([htmlPromise,cssPromise,jsPromise]);
      loadedIds.add(def.id); loadedIds.add(registeredId);
      const mod=normalizeModule(registry.get(def.id)||registry.get(registeredId),def);
      if(!mod?.mount) throw new Error(`${def.title||def.id} did not register a valid mount(context) function.`);
      return mod;
    }
  }
})();
