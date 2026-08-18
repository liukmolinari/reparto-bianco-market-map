(() => {
  const CHAINS = ['MediaWorld','Unieuro','Euronics','Trony','Comet'];
  const ZONES = ['Italia','Nord Ovest','Nord Est','Centro','Sud','Isole'];
  const REGIONS = ['Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'];
  const REGION_ZONE = {
    'Piemonte':'Nord Ovest',"Valle d'Aosta":'Nord Ovest','Liguria':'Nord Ovest','Lombardia':'Nord Ovest',
    'Trentino-Alto Adige':'Nord Est','Veneto':'Nord Est','Friuli-Venezia Giulia':'Nord Est','Emilia-Romagna':'Nord Est',
    'Toscana':'Centro','Umbria':'Centro','Marche':'Centro','Lazio':'Centro',
    'Abruzzo':'Sud','Molise':'Sud','Campania':'Sud','Puglia':'Sud','Basilicata':'Sud','Calabria':'Sud',
    'Sicilia':'Isole','Sardegna':'Isole'
  };
  const STORE_KEY='rb-marketmap-custom-v1';
  const REMOVED_KEY='rb-marketmap-removed-v1';
  const CHAIN_META = {
    MediaWorld: { logo: 'logo-mediaworld.png', className: 'marker-MediaWorld', w: 42, h: 42 },
    Unieuro: { logo: 'logo-unieuro.png', className: 'marker-Unieuro', w: 42, h: 42 },
    Euronics: { logo: 'logo-euronics.png', className: 'marker-Euronics', w: 42, h: 42 },
    Trony: { logo: 'logo-trony.png', className: 'marker-Trony', w: 64, h: 36 },
    Comet: { logo: 'logo-comet.png', className: 'marker-Comet', w: 66, h: 36 },
    Custom: { logo: '', className: 'marker-Custom', w: 40, h: 40 }
  };

  let activeChain='ALL', activeZone='Italia', activePriority='ALL';
  let customStores = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  let removed = new Set(JSON.parse(localStorage.getItem(REMOVED_KEY) || '[]'));

  const map = L.map('map', {zoomControl:true, minZoom:5, zoomSnap:0.5}).setView([42.55,12.55], 5.8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover:false,
    maxClusterRadius:48,
    spiderfyOnMaxZoom:true,
    disableClusteringAtZoom:11,
    iconCreateFunction(group){
      const count = group.getChildCount();
      const size = count < 10 ? 38 : count < 100 ? 42 : 46;
      return L.divIcon({
        className:'custom-cluster-wrap',
        html:`<div class="custom-cluster" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
        iconSize:[size,size]
      });
    }
  });
  map.addLayer(cluster);

  const chainFilters=document.getElementById('chainFilters');
  const zoneFilters=document.getElementById('zoneFilters');
  const visibleCount=document.getElementById('visibleCount');
  const zoneLabel=document.getElementById('zoneLabel');
  const chainLabel=document.getElementById('chainLabel');

  function makeChip(label, attrs={}){
    const b=document.createElement('button');
    b.className='chip';
    b.textContent=label;
    Object.entries(attrs).forEach(([k,v])=>b.dataset[k]=v);
    return b;
  }
  chainFilters.appendChild(makeChip('Tutte',{chain:'ALL'}));
  CHAINS.forEach(c=>{const b=makeChip(c,{chain:c});b.classList.add('chain');chainFilters.appendChild(b)});
  ZONES.forEach(z=>zoneFilters.appendChild(makeChip(z,{zone:z})));

  function setActiveButtons(){
    document.querySelectorAll('[data-chain]').forEach(b=>b.classList.toggle('active',b.dataset.chain===activeChain));
    document.querySelectorAll('[data-zone]').forEach(b=>b.classList.toggle('active',b.dataset.zone===activeZone));
    document.querySelectorAll('[data-priority]').forEach(b=>b.classList.toggle('active',b.dataset.priority===activePriority));
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-chain],[data-zone],[data-priority]');
    if(!b) return;
    if(b.dataset.chain) activeChain=b.dataset.chain;
    if(b.dataset.zone) activeZone=b.dataset.zone;
    if(b.dataset.priority) activePriority=b.dataset.priority;
    setActiveButtons();
    render();
  });

  function allStores(){
    return [...window.BASE_STORES.filter(s=>!removed.has(s.id)), ...customStores.filter(s=>!removed.has(s.id))];
  }

  function visibleStores(){
    return allStores().filter(s =>
      (activeChain==='ALL' || s.chain===activeChain) &&
      (activeZone==='Italia' || s.zone===activeZone) &&
      (activePriority==='ALL' || (activePriority==='TOP25' ? s.top25 : s.priority===activePriority))
    );
  }

  function markerIcon(store){
    const meta = CHAIN_META[store.chain] || CHAIN_META.Custom;
    const html = meta.logo
      ? `<div class="chain-marker ${meta.className}"><img src="${meta.logo}" alt="${store.chain}" loading="lazy" /></div>`
      : `<div class="chain-marker ${meta.className}"><span>+</span></div>`;
    return L.divIcon({
      className:'map-marker-wrap',
      html,
      iconSize:[meta.w, meta.h],
      iconAnchor:[Math.round(meta.w/2), Math.round(meta.h/2)],
      popupAnchor:[0, -Math.round(meta.h/2)]
    });
  }

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function popupHtml(s){
    const source=s.source?`<a target="_blank" rel="noopener" href="${esc(s.source)}">Fonte</a>`:'';
    return `<div class="popup-card">
      <div class="popup-title">${esc(s.chain)} — ${esc(s.name)}</div>
      <div class="popup-sub">${esc(s.city)} · ${esc(s.region)} · ${esc(s.zone)}</div>
      <div class="popup-row"><span>Priorità</span><b><span class="badge">${esc(s.priority)}</span></b></div>
      <div class="popup-row"><span>Operational Fit</span><b>${esc(s.opFit ?? '—')}</b></div>
      <div class="popup-row"><span>Commercial Fit</span><b>${esc(s.comFit ?? '—')}</b></div>
      ${s.geoMethod && s.geoMethod !== 'store-verified' ? `<div class="popup-sub geo-note">Posizione mappa indicativa: centro del comune.</div>` : ''}
      ${s.notes?`<div class="popup-sub" style="margin-top:8px">${esc(s.notes)}</div>`:''}
      <div class="popup-actions">${source}<button data-remove-id="${esc(s.id)}">Rimuovi</button></div>
    </div>`;
  }

  function render(){
    cluster.clearLayers();
    const stores = visibleStores();
    stores.forEach(s=>L.marker([s.lat,s.lng],{icon:markerIcon(s)}).bindPopup(popupHtml(s)).addTo(cluster));
    visibleCount.textContent = stores.length;
    zoneLabel.textContent = activeZone;
    chainLabel.textContent = activeChain==='ALL' ? 'Tutte' : activeChain;
  }

  map.on('popupopen',()=>{
    document.querySelectorAll('[data-remove-id]').forEach(btn=>btn.onclick=()=>removeStore(btn.dataset.removeId));
  });

  function removeStore(id){
    if(!confirm('Rimuovere questo negozio dalla mappa su questo dispositivo?')) return;
    removed.add(id);
    localStorage.setItem(REMOVED_KEY,JSON.stringify([...removed]));
    map.closePopup();
    render();
  }

  map.on('contextmenu',e=>{
    L.popup().setLatLng(e.latlng).setContent(`<b>Coordinate</b><br>Lat ${e.latlng.lat.toFixed(6)}<br>Lng ${e.latlng.lng.toFixed(6)}`).openOn(map);
  });

  const drawer=document.getElementById('drawer');
  document.getElementById('openTools').onclick=()=>{drawer.classList.add('open');drawer.setAttribute('aria-hidden','false')};
  document.getElementById('closeTools').onclick=()=>{drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true')};
  document.getElementById('fitItaly').onclick=()=>{activeZone='Italia';setActiveButtons();map.setView([42.55,12.55],5.8);render()};
  document.getElementById('showTop25').onclick=()=>{activePriority='TOP25';setActiveButtons();render()};

  const modal=document.getElementById('addModal'), backdrop=document.getElementById('modalBackdrop');
  const fChain=document.getElementById('fChain'), fRegion=document.getElementById('fRegion');
  CHAINS.forEach(c=>fChain.add(new Option(c,c)));
  fChain.add(new Option('Altro','Custom'));
  REGIONS.forEach(r=>fRegion.add(new Option(r,r)));

  function openModal(){
    const c=map.getCenter();
    document.getElementById('fLat').value=c.lat.toFixed(6);
    document.getElementById('fLng').value=c.lng.toFixed(6);
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
  }
  function closeModal(){
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
  document.getElementById('addStoreFab').onclick=openModal;
  document.getElementById('closeAdd').onclick=closeModal;
  backdrop.onclick=closeModal;
  document.getElementById('useMapCenter').onclick=()=>{
    const c=map.getCenter();
    document.getElementById('fLat').value=c.lat.toFixed(6);
    document.getElementById('fLng').value=c.lng.toFixed(6);
  };

  document.getElementById('addStoreForm').onsubmit=e=>{
    e.preventDefault();
    const region=fRegion.value;
    const s={
      id:'custom-'+Date.now(),
      chain:fChain.value,
      name:document.getElementById('fName').value.trim(),
      city:document.getElementById('fCity').value.trim(),
      region,
      zone:REGION_ZONE[region]||'Italia',
      priority:document.getElementById('fPriority').value,
      opFit:Number(document.getElementById('fOpFit').value)||0,
      comFit:Number(document.getElementById('fComFit').value)||0,
      top25:false,
      lat:Number(document.getElementById('fLat').value),
      lng:Number(document.getElementById('fLng').value),
      notes:document.getElementById('fNotes').value.trim(),
      custom:true
    };
    customStores.push(s);
    localStorage.setItem(STORE_KEY,JSON.stringify(customStores));
    closeModal();
    e.target.reset();
    render();
    map.setView([s.lat,s.lng],12);
  };

  document.getElementById('exportData').onclick=()=>{
    const data={version:1,customStores,removed:[...removed]};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='reparto-bianco-market-map-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  document.getElementById('importData').onchange=async e=>{
    const file=e.target.files[0];
    if(!file) return;
    try {
      const data=JSON.parse(await file.text());
      customStores=Array.isArray(data.customStores)?data.customStores:[];
      removed=new Set(Array.isArray(data.removed)?data.removed:[]);
      localStorage.setItem(STORE_KEY,JSON.stringify(customStores));
      localStorage.setItem(REMOVED_KEY,JSON.stringify([...removed]));
      render();
      alert('Dati importati.');
    } catch(err) {
      alert('File non valido.');
    }
    e.target.value='';
  };

  document.getElementById('resetCustom').onclick=()=>{
    if(!confirm('Ripristinare la mappa iniziale e cancellare modifiche locali?')) return;
    customStores=[];
    removed.clear();
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(REMOVED_KEY);
    render();
  };

  setActiveButtons();
  render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
