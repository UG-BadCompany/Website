(() => {
  const SERVICE_GROUPS = [
    { title: 'Home Systems', services: ['HVAC', 'Water Heaters', 'Plumbing', 'Electrical'] },
    { title: 'Interior Repairs', services: ['Drywall', 'Painting', 'Doors', 'Windows', 'Appliances'] },
    { title: 'Property Support', services: ['Handyman', 'Facilities Maintenance', 'Property Maintenance', 'Commercial Maintenance', 'General Contracting', 'Tenant Improvements'] },
  ];
  const SERVICE_ICONS = { HVAC:'❄️', 'Water Heaters':'♨️', Plumbing:'🚿', Electrical:'⚡', Drywall:'▧', Painting:'🎨', Doors:'🚪', Windows:'▣', Appliances:'🔌', Handyman:'🛠️', 'Facilities Maintenance':'🏢', 'Property Maintenance':'🏡', 'Commercial Maintenance':'🏬', 'General Contracting':'📐', 'Tenant Improvements':'🔨' };
  const SERVICE_DESCRIPTIONS = { HVAC:'Diagnostics, maintenance, comfort issues, and replacement coordination.', 'Water Heaters':'Same-day-minded repair, replacement, and clean installation support.', Plumbing:'Leaks, fixtures, drains, valves, and practical repair scopes.', Electrical:'Switches, outlets, lighting, fans, punch lists, and testing.', Drywall:'Patches, texture blending, water-damage repair, and finish-ready walls.', Painting:'Touch-ups, repaints, trim, and clean finish work.', Doors:'Alignment, hardware, weatherstripping, repairs, and replacements.', Windows:'Sealing, hardware, repairs, and replacement coordination.', Appliances:'Install, troubleshoot, and property-ready appliance support.', Handyman:'Punch lists, small installs, repairs, and turnover work.', 'Facilities Maintenance':'Organized recurring care for operational properties.', 'Property Maintenance':'Responsive support for homeowners and managed properties.', 'Commercial Maintenance':'Maintenance for offices, retail, and tenant spaces.', 'General Contracting':'Coordinated improvements and multi-trade repair scopes.', 'Tenant Improvements':'Build-out, refresh, and turnover work for tenant-ready spaces.' };
  const DEFAULT_PROJECTS = [
    { title:'Kitchen Ceiling Repair', category:'Drywall / Paint', description:'Water-damage repair, texture blend, and clean repaint.', completionTime:'Completed in 1 day', priceRange:'$425 - $680' },
    { title:'Mini Split Installation', category:'HVAC', description:'Clean wall-mounted install with line-hide finish.', completionTime:'Install-ready scope', priceRange:'Quote reviewed' },
    { title:'Water Heater Replacement', category:'Plumbing', description:'Replacement planning, connections, and haul-away coordination.', completionTime:'Same-day capable', priceRange:'By model' },
    { title:'Electrical Fixture Replacement', category:'Electrical', description:'Safe fixture swap, box check, and functional testing.', completionTime:'Completed in hours', priceRange:'Fixed quote' },
  ];
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const sorted = (items = []) => [...items].sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
  const initials = (name = 'TA') => name.split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase() || 'TA';
  const button = (text, href, secondary = false, attrs = '') => `<a class="btn ${secondary ? 'secondary' : ''}" href="${esc(href || '#estimate')}" ${attrs}>${esc(text)}</a>`;

  const buildDefaults = (company = window.TACompany?.current || {}) => {
    const companyName = company.displayName || company.companyName || 'T & A Contracting';
    const serviceArea = company.serviceArea || 'Phoenix / Arizona';
    return {
      navLabels: { home:'Home', services:'Services', projects:'Projects', about:'About', contact:'Contact', portal:'Client Portal', dashboard:'Dashboard', estimate:'Request Estimate' },
      heroBadge: 'Modern Contractor Experience',
      heroLogoSize: 'xl',
      showHeroCompanyName: true,
      heroHeadline: 'Reliable maintenance, repairs, and improvements for Phoenix properties.',
      heroSubheadline: 'Request service, upload photos, review your quote, and track your job from one clean portal.',
      heroTrustLine: 'Locally owned · AI photo estimates · Arizona',
      primaryButtonText: 'Request Estimate', primaryButtonLink: '#estimate', secondaryButtonText: 'View Projects', secondaryButtonLink: '#projects', showSecondaryButton: true,
      estimatePreviewEyebrow: 'Current Estimate', estimatePreviewTitle: 'Kitchen Ceiling Repair', estimatePreviewRange: '$425 - $680', estimatePreviewStatus: 'Worker Assigned', estimatePreviewThumbnail: '',
      trustCards: [['Locally Owned','Phoenix-area service with practical property experience.'],['AI Photo Estimates','Upload project photos for faster quote review.'],['Residential & Commercial','Homes, rentals, facilities, and tenant spaces.'],['Portal Tracking','Quotes, job status, and invoices in one place.']].map(([title,description], index) => ({ title, description, visible: true, sortOrder: index + 1 })),
      servicesTitle: 'Compact trade support without the endless scroll.',
      servicesSubtitle: 'Grouped services make it easier to find the right help fast.',
      serviceGroups: SERVICE_GROUPS.map((group, groupIndex) => ({ ...group, sortOrder: groupIndex + 1, visible: true })),
      servicesConfig: SERVICE_GROUPS.flatMap((group) => group.services).map((name, index) => ({ name, icon: SERVICE_ICONS[name], description: SERVICE_DESCRIPTIONS[name], group: SERVICE_GROUPS.find((g) => g.services.includes(name))?.title || '', enabled: true, sortOrder: index + 1 })),
      projectsTitle: 'Real Projects. Real Results.', projectsSubtitle: 'See recent repairs, maintenance, installations, and property improvements.', projects: DEFAULT_PROJECTS.map((project, index) => ({ ...project, visible: true, sortOrder: index + 1 })),
      howItWorksTitle: 'How it works.', howItWorksText: 'A simple path from first request to paid invoice.',
      howItWorksSteps: ['Request Estimate','Upload Photos','AI + Admin Review','Approve Quote','Worker Assigned','Job Complete','Invoice / Payment'].map((title, index) => ({ title, description: ['Send the basics.','Add clear job photos.','We review the scope.','Accept the plan.','Know who is coming.','Review completion.','Close out cleanly.'][index], visible: true, sortOrder: index + 1 })),
      aboutTitle: `Locally owned maintenance for ${serviceArea} properties.`,
      aboutText: `${companyName} supports residential and commercial property owners with repair, maintenance, improvement, quote, and job tracking workflows that feel organized from the first request.`,
      aboutText2: 'We focus on practical scopes, clear communication, photo-backed estimates, and dependable follow-through for Arizona properties.',
      yearsExperienceText: 'Residential + commercial maintenance', localText: 'Phoenix / Arizona service area', showAbout: true,
      ctaHeadline: 'Ready for a cleaner contractor experience?', ctaSubheadline: 'Send details and photos. We’ll review the request and follow up with clear next steps.', ctaButtonText: 'Request Estimate', ctaButtonLink: '#estimate',
      footerText: `${companyName} provides property maintenance, repairs, improvements, and organized customer communication.`, footerPhone: company.supportPhone || company.businessPhone || '', footerEmail: company.supportEmail || '', footerAddress: serviceArea, businessHours: company.businessHours || '', licenseText: company.licenseNumber || '',
      sectionVisibility: { hero:true, trust:true, services:true, projects:true, howItWorks:true, about:true, cta:true, contactFooter:true }
    };
  };
  const merge = (settings = {}, company = {}) => ({ ...buildDefaults(company), ...settings, navLabels: { ...buildDefaults(company).navLabels, ...(settings.navLabels || {}) }, sectionVisibility: { ...buildDefaults(company).sectionVisibility, ...(settings.sectionVisibility || {}) } });

  const logoMarkup = (company = {}, settings = {}) => {
    const name = company.displayName || company.companyName || 'T & A Contracting';
    const logo = company.logoUrl || settings.logoUrl || '';
    const label = settings.heroBadge || 'Modern Contractor Experience';
    return `<span class="hero-brand-lockup hero-logo-${esc(settings.heroLogoSize || 'xl')}"><span class="hero-logo-mark">${logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(name))}</span><span><em>${esc(label)}</em>${settings.showHeroCompanyName === false ? '' : `<strong>${esc(name)}</strong><small>Arizona Property Maintenance</small>`}</span></span>`;
  };

  const serviceCards = (settings) => {
    const services = sorted(settings.servicesConfig || []).filter((service) => service.enabled !== false && !['Roofing','Flooring'].includes(service.name));
    const groups = sorted(settings.serviceGroups || SERVICE_GROUPS).filter((group) => group.visible !== false);
    return groups.map((group) => {
      const groupServices = services.filter((service) => (service.group || group.title) === group.title || (group.services || []).includes(service.name));
      if (!groupServices.length) return '';
      return `<section class="service-group-card"><div><span class="pill">${esc(group.title)}</span></div><div class="service-mini-grid">${groupServices.map((service) => `<article class="service-tile compact-service"><span class="service-orb">${esc(service.icon || SERVICE_ICONS[service.name] || '✓')}</span><h3>${esc(service.name)}</h3><p>${esc(service.description || SERVICE_DESCRIPTIONS[service.name] || 'Professional repair and maintenance support.')}</p></article>`).join('')}</div></section>`;
    }).join('');
  };

  const cardList = (items = [], cls = 'trust-card') => sorted(items).filter((item)=>item.visible!==false).map((item)=>`<article class="${cls} premium-reveal"><span>${esc(item.icon || '✓')}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`).join('');

  const projectCards = (settings, gallery = []) => {
    const galleryProjects = (gallery || []).filter((item) => item.visible !== false).map((item, index) => ({ title: item.title || 'Recent Project', category: item.category || item.serviceCategory || 'Project', description: item.description || item.caption || 'Recent completed property work.', completionTime: item.completionTime || 'Recently completed', priceRange: item.priceRange || '', imageUrl: item.imageUrl, beforeImageUrl: item.beforeImageUrl, afterImageUrl: item.afterImageUrl, sortOrder: item.sortOrder || index + 1, visible: true }));
    const configured = sorted(settings.projects || []).filter((item) => item.visible !== false);
    const projects = galleryProjects.length ? galleryProjects : configured;
    if (!projects.length) return '';
    return projects.map((project) => {
      const visual = project.beforeImageUrl && project.afterImageUrl ? `<div class="before-after"><img src="${esc(project.beforeImageUrl)}" alt="Before ${esc(project.title)}"><img src="${esc(project.afterImageUrl)}" alt="After ${esc(project.title)}"></div>` : (project.imageUrl ? `<img src="${esc(project.imageUrl)}" alt="${esc(project.title)}">` : `<div class="project-gradient-card"><span>${esc(project.category || 'Project')}</span></div>`);
      return `<article class="project-card job-photo-card premium-reveal">${visual}<span><em>${esc(project.category || 'Project')}</em><strong>${esc(project.title)}</strong><p>${esc(project.description || '')}</p><small>${esc(project.completionTime || '')}${project.priceRange ? ` · ${esc(project.priceRange)}` : ''}</small></span></article>`;
    }).join('');
  };

  const bindLightbox = () => {
    document.querySelectorAll('.project-card img, .job-photo-card img').forEach((img) => {
      img.addEventListener('click', () => {
        const overlay = document.createElement('div'); overlay.className = 'homepage-lightbox';
        overlay.innerHTML = `<button type="button" aria-label="Close">×</button><figure><img src="${esc(img.currentSrc || img.src)}" alt="${esc(img.alt)}"><figcaption>${esc(img.alt)}</figcaption></figure>`;
        overlay.querySelector('button').onclick = () => overlay.remove();
        overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
        document.body.append(overlay);
      }, { once: false });
    });
  };

  const syncHeaderAuth = async () => {
    const portalLinks = document.querySelectorAll('[data-portal-link]');
    const dashboardLinks = document.querySelectorAll('[data-dashboard-link]');
    let authenticated = false;
    try {
      const me = await window.TAApi?.get?.('/.netlify/functions/me');
      authenticated = Boolean(me?.user || me?.session || me?.authenticated || me?.ok);
    } catch { authenticated = false; }
    portalLinks.forEach((link) => { link.hidden = authenticated; link.href = '/login/'; link.textContent = link.dataset.label || 'Client Portal'; });
    dashboardLinks.forEach((link) => { link.hidden = !authenticated; link.href = '/dashboard/'; link.textContent = link.dataset.label || 'Dashboard'; });
    document.body.classList.toggle('is-authenticated', authenticated);
  };

  const bindHeader = () => {
    const header = document.querySelector('.site-header');
    const toggle = document.querySelector('.mobile-menu-toggle');
    const onScroll = () => {
      const scrolled = window.scrollY > 28;
      document.body.classList.toggle('is-scrolled', scrolled);
      document.body.classList.toggle('scrolled', scrolled);
      header?.classList.toggle('is-scrolled', scrolled);
    };
    onScroll();
    document.addEventListener('scroll', onScroll, { passive: true });
    toggle?.addEventListener('click', () => { const open = header.classList.toggle('menu-open'); toggle.setAttribute('aria-expanded', String(open)); });
    document.querySelectorAll('.nav-links a[href^="#"], .hero-actions a[href^="#"], footer a[href^="#"]').forEach((link) => link.addEventListener('click', () => header?.classList.remove('menu-open')));
  };

  const renderDynamic = (settings, gallery, company = {}) => {
    const root = document.getElementById('homepage-dynamic-sections');
    if (!root) return;
    const visible = settings.sectionVisibility || {};
    const projectHtml = projectCards(settings, gallery);
    root.innerHTML = `
      <section class="hero premium-landing-hero customer-landing-hero homepage-hero" id="home">
        <div class="hero-backdrop" aria-hidden="true"></div>
        <div class="container hero-grid">
          <div class="hero-copy premium-reveal">
            ${logoMarkup(company, settings)}
            <span class="pill hero-pill">${esc(settings.heroTrustLine || settings.heroBadge)}</span>
            <h1>${esc(settings.heroHeadline)}</h1>
            <p>${esc(settings.heroSubheadline)}</p>
            <div class="hero-actions">${button(settings.primaryButtonText, settings.primaryButtonLink)}${settings.showSecondaryButton === false ? '' : button(settings.secondaryButtonText, settings.secondaryButtonLink, true)}</div>
            <div class="hero-metrics trust-badges"><span>✓ Locally owned</span><span>✓ AI photo estimates</span><span>✓ Arizona</span></div>
          </div>
          <aside class="contractor-command-visual premium-reveal product-mockup" aria-label="Premium estimate workflow preview">
            <div class="mockup-glow"></div>
            <div class="work-order-card main premium-estimate-card"><small>${esc(settings.estimatePreviewEyebrow || 'Current Estimate')}</small><h3>${esc(settings.estimatePreviewTitle || 'Kitchen Ceiling Repair')}</h3>${settings.estimatePreviewThumbnail ? `<img class="estimate-thumb" src="${esc(settings.estimatePreviewThumbnail)}" alt="Estimate upload preview">` : ''}<ul><li>✓ Photos Uploaded</li><li>✓ AI Reviewed</li><li>✓ Quote Ready</li></ul><strong>${esc(settings.estimatePreviewRange || '$425 - $680')}</strong><em>${esc(settings.estimatePreviewStatus || 'Worker Assigned')}</em></div>
            <div class="ai-preview-card"><span>AI review</span><strong>91% confidence</strong><em>Photos received. Admin verifies final quote.</em></div>
            <div class="floating-trade-card trade-hvac">HVAC</div><div class="floating-trade-card trade-electric">Electrical</div><div class="floating-trade-card trade-plumb">Plumbing</div><div class="floating-trade-card trade-handyman">Handyman</div>
          </aside>
        </div>
      </section>
      ${visible.trust !== false ? `<section class="section trust-bar-section"><div class="container trust-bar">${cardList(settings.trustCards, 'trust-card')}</div></section>` : ''}
      ${visible.services !== false ? `<section class="section services-premium-section" id="services"><div class="container"><div class="section-heading centered premium-reveal"><span class="pill">Services</span><h2>${esc(settings.servicesTitle)}</h2><p>${esc(settings.servicesSubtitle)}</p></div><div class="customer-service-grid grouped-services">${serviceCards(settings)}</div></div></section>` : ''}
      ${visible.projects !== false && projectHtml ? `<section class="section projects-section recent-work-section" id="projects"><div class="container"><div class="section-heading premium-reveal"><span class="pill">Projects</span><h2>${esc(settings.projectsTitle)}</h2><p>${esc(settings.projectsSubtitle)}</p></div><div class="project-grid job-photo-grid masonry-grid">${projectHtml}</div></div></section>` : ''}
      ${visible.howItWorks !== false ? `<section class="section how-it-works-section" id="process"><div class="container"><div class="section-heading centered premium-reveal"><span class="pill">How It Works</span><h2>${esc(settings.howItWorksTitle)}</h2><p>${esc(settings.howItWorksText)}</p></div><div class="visual-pipeline">${sorted(settings.howItWorksSteps).filter((step)=>step.visible!==false).map((step, i)=>`<article class="pipeline-step premium-reveal"><span>${i + 1}</span><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p></article>`).join('')}</div></div></section>` : ''}
      ${settings.showAbout !== false && visible.about !== false ? `<section class="section about-section" id="about"><div class="container grid grid-2"><div class="premium-reveal"><span class="pill">About</span><h2>${esc(settings.aboutTitle)}</h2><p>${esc(settings.aboutText)}</p>${settings.aboutText2 ? `<p>${esc(settings.aboutText2)}</p>` : ''}</div><div class="premium-proof-card premium-reveal"><strong>${esc(settings.yearsExperienceText)}</strong><p>${esc(settings.localText)}</p><div class="mini-trust-row"><span>Locally owned</span><span>Residential</span><span>Commercial</span></div></div></div></section>` : ''}
      <section class="section estimate-premium-section" id="estimate">${document.getElementById('estimate-template')?.innerHTML || ''}</section>
      ${visible.cta !== false ? `<section class="section contact-cta-section" id="contact"><div class="container final-customer-cta premium-reveal"><h2>${esc(settings.ctaHeadline)}</h2><p>${esc(settings.ctaSubheadline)}</p><div class="contact-grid"><span><b>Phone</b>${esc(settings.footerPhone || 'Contact through portal')}</span><span><b>Email</b>${esc(settings.footerEmail || 'Use request form')}</span><span><b>Service Area</b>${esc(settings.footerAddress || 'Phoenix / Arizona')}</span>${settings.businessHours ? `<span><b>Hours</b>${esc(settings.businessHours)}</span>` : ''}${settings.licenseText ? `<span><b>License</b>${esc(settings.licenseText)}</span>` : ''}</div><div class="hero-actions">${button(settings.ctaButtonText, settings.ctaButtonLink)}${button('Client Portal', '/login/', true, 'data-portal-link data-label="Client Portal"')}${button('Dashboard', '/dashboard/', true, 'data-dashboard-link data-label="Dashboard" hidden')}</div></div></section>` : ''}`;
    bindLightbox();
    window.TAEstimateWizard?.bind?.();
    const footer = document.querySelector('[data-dynamic-footer]');
    const name = company.displayName || company.companyName || 'T & A Contracting';
    if (footer) footer.innerHTML = visible.contactFooter === false ? '' : `<div class="container footer-premium footer-grid-customer"><div>${logoMarkup(company, settings)}<p>${esc(settings.footerText)}</p>${settings.licenseText ? `<small>License: ${esc(settings.licenseText)}</small>` : ''}</div><div><h3>Contact</h3>${settings.footerPhone ? `<a href="tel:${esc(settings.footerPhone)}">${esc(settings.footerPhone)}</a>` : ''}${settings.footerEmail ? `<a href="mailto:${esc(settings.footerEmail)}">${esc(settings.footerEmail)}</a>` : ''}<a href="/login/" data-portal-link data-label="Client Portal">Client Portal</a><a href="/dashboard/" data-dashboard-link data-label="Dashboard" hidden>Dashboard</a><a href="#estimate">Request Estimate</a></div><div><h3>Service Area</h3><p>${esc(settings.footerAddress || 'Phoenix / Arizona')}</p>${settings.businessHours ? `<p>${esc(settings.businessHours)}</p>` : ''}<p>© ${new Date().getFullYear()} ${esc(name)}. All rights reserved.</p></div></div>`;
    window.TACompany?.apply?.(company || window.TACompany.current || window.TACompany.fallback || {});
    window.TATheme?.apply?.(company || window.TACompany?.current || {});
    syncHeaderAuth();
    document.dispatchEvent(new CustomEvent('ta:homepage-rendered'));
  };

  document.addEventListener('DOMContentLoaded', async () => {
    bindHeader();
    let company = window.TACompany?.current || {};
    try { company = await window.TACompany?.load?.() || company; } catch {}
    let settings = buildDefaults(company), gallery = [];
    try { const data = await window.TAApi.get('/.netlify/functions/homepage-settings'); const loaded = data.settings || data.homepage || data; settings = loaded?.id ? merge(loaded, company) : merge({}, company); } catch { settings = merge({}, company); }
    try { const data = await window.TAApi.get('/.netlify/functions/homepage-gallery'); gallery = data.gallery || []; } catch { gallery = []; }
    renderDynamic(settings, gallery, company);
  });
})();
