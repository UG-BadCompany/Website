(() => {
  const SERVICE_CATEGORIES = ['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements'];
  const SERVICE_ICONS = { HVAC:'❄️', 'Water Heaters':'♨️', Plumbing:'🚿', Electrical:'⚡', Drywall:'▧', Painting:'🎨', Doors:'🚪', Windows:'▣', Appliances:'🔌', Handyman:'🛠️', 'Facilities Maintenance':'🏢', 'Property Maintenance':'🏡', 'Commercial Maintenance':'🏬', 'General Contracting':'📐', 'Tenant Improvements':'🔨' };
  const SERVICE_DESCRIPTIONS = { HVAC:'Comfort diagnostics, tune-ups, and replacement coordination.', 'Water Heaters':'Hot-water repairs, replacements, and clean installation support.', Plumbing:'Leaks, fixtures, drains, valves, and practical repair scopes.', Electrical:'Switches, outlets, lighting, punch lists, and safe troubleshooting.', Drywall:'Clean patches, texture blending, repairs, and finish-ready walls.', Painting:'Interior refreshes, touch-ups, exteriors, and crisp finish work.', Doors:'Alignment, hardware, weatherstripping, repairs, and replacements.', Windows:'Sealing, hardware, repairs, and replacement coordination.', Appliances:'Install, troubleshoot, and property-ready appliance support.', Handyman:'Punch lists, small installs, repairs, and turnover work.', 'Facilities Maintenance':'Organized care for offices, retail, and operational properties.', 'Property Maintenance':'One-time and recurring support for managed properties.', 'Commercial Maintenance':'Responsive maintenance for business and tenant spaces.', 'General Contracting':'Coordinated repairs, improvements, and multi-trade scopes.', 'Tenant Improvements':'Build-out, refresh, and turnover work for tenant-ready spaces.' };
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const sorted = (items = []) => [...items].sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0));
  const initials = (name = 'TA') => name.split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase() || 'TA';
  const button = (text, href, secondary = false) => `<a class="btn ${secondary ? 'secondary' : ''}" href="${esc(href || '#estimate')}"${href?.includes('/login') ? ' data-portal-link' : ''}>${esc(text)}</a>`;

  const buildDefaults = (company = window.TACompany?.current || {}) => {
    const companyName = company.displayName || company.companyName || 'TA Contracting';
    const serviceArea = company.serviceArea || 'Arizona';
    const trustCards = [
      ['Locally Owned','Arizona-focused service with practical property experience.'],
      ['AI Photo Estimates','Upload project photos for faster, smarter quote review.'],
      ['Residential & Commercial','Built for homes, rentals, facilities, and tenant spaces.'],
      ['Fast Quote Turnaround','Clear next steps without chasing texts or spreadsheets.'],
    ];
    return {
      heroBadge: 'Locally owned · AI photo estimates · Arizona', heroLogoSize: 'xl',
      heroHeadline: `${serviceArea} Property Maintenance Done Right.`,
      heroSubheadline: 'Professional repairs, maintenance, HVAC, plumbing, electrical, and handyman services with AI-powered estimates and real-time project tracking.',
      primaryButtonText: 'Request Estimate', primaryButtonLink: '#estimate', secondaryButtonText: 'View Our Work', secondaryButtonLink: '#recent-work', showSecondaryButton: true,
      servicesTitle: 'Expert trades without the chaos.',
      servicesSubtitle: 'Premium maintenance, repair, and improvement scopes delivered through an organized client experience.',
      servicesConfig: SERVICE_CATEGORIES.map((name, index) => ({ name, icon: SERVICE_ICONS[name], description: SERVICE_DESCRIPTIONS[name], enabled: true, sortOrder: index + 1 })),
      trustCards: trustCards.map(([title,description], index) => ({ title, description, visible: true, sortOrder: index + 1 })),
      howItWorksTitle: 'One visual workflow from request to paid.',
      howItWorksText: 'Every job moves through the same transparent pipeline, so customers always know what comes next.',
      howItWorksSteps: ['Request Estimate','AI Review','Quote Ready','Approve Work','Worker Assigned','Project Complete','Invoice Paid'].map((title, index) => ({ title, description: ['Send details and photos.','Photo intelligence reviews likely scope.','Receive clear pricing.','Approve from the portal.','Know who is on the job.','Review finished work.','Close it out cleanly.'][index], visible: true, sortOrder: index + 1 })),
      aboutTitle: `A modern contractor experience for ${serviceArea} properties.`,
      aboutText: `${companyName} combines practical trade work with a clean digital process for estimates, approvals, updates, and invoices.`,
      aboutText2: 'The result feels less like chasing a contractor and more like managing a premium service appointment.',
      yearsExperienceText: 'Repair, maintenance, and improvement work with a polished customer process', localText: 'Built for Arizona homeowners, property managers, and commercial teams.', showAbout: true,
      whyChooseTitle: 'Why property owners choose us',
      whyChooseCards: trustCards.map(([title, description], index) => ({ icon: ['🏜️','⚡','✓','🏢'][index], title, description, visible: true, sortOrder: index + 1 })),
      serviceAreaTitle: `Serving ${serviceArea}.`, serviceAreaText: `${companyName} reviews each request and confirms availability for your property, timing, and scope.`,
      citiesServed: serviceArea && serviceArea !== 'Arizona' ? serviceArea.split(',').map((city) => city.trim()).filter(Boolean) : ['Phoenix area','East Valley','West Valley','Nearby Arizona communities'], travelNotes: '',
      ctaHeadline: 'Ready for a cleaner contractor experience?', ctaSubheadline: 'Send photos, get clear next steps, and track the work from one portal.', ctaButtonText: 'Request Estimate', ctaButtonLink: '#estimate',
      footerText: `${companyName} provides modern property maintenance, repair, and improvement services with organized customer communication.`, footerPhone: company.supportPhone || company.businessPhone || '', footerEmail: company.supportEmail || '', footerAddress: company.businessAddress || '', licenseText: company.licenseNumber || '',
      sectionVisibility: {}, sectionOrder: []
    };
  };

  const merge = (settings = {}, company = {}) => ({ ...buildDefaults(company), ...settings });

  const logoMarkup = (company = {}, settings = {}) => {
    const name = company.displayName || company.companyName || 'TA Contracting';
    const logo = company.logoUrl || settings.logoUrl || '';
    return `<span class="hero-brand-lockup hero-logo-${esc(settings.heroLogoSize || 'xl')}"><span class="hero-logo-mark">${logo ? `<img src="${esc(logo)}" alt="">` : esc(initials(name))}</span><span><em>Modern contractor experience</em><strong>${esc(name)}</strong></span></span>`;
  };

  const serviceCards = (settings) => sorted(settings.servicesConfig || []).filter((item)=>item.enabled!==false).map((item)=>`
    <article class="service-tile premium-reveal">
      <span class="service-orb">${esc(item.icon || '✓')}</span>
      <h3>${esc(item.name)}</h3>
      <p>${esc(item.description)}</p>
      <small>Plan scope → quote → schedule</small>
    </article>`).join('');

  const cardList = (items = [], cls = 'trust-card') => sorted(items).filter((item)=>item.visible!==false).map((item)=>`
    <article class="${cls} premium-reveal"><span>${esc(item.icon || '◆')}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`).join('');

  const galleryCards = (gallery = []) => {
    const items = Array.isArray(gallery) ? gallery.filter((item) => item && (item.imageUrl || item.url || item.photoUrl || item.beforeImageUrl || item.afterImageUrl)) : [];
    if (!items.length) return '';
    return sorted(items).slice(0, 9).map((item, index) => {
      const image = item.imageUrl || item.url || item.photoUrl || '';
      const before = item.beforeImageUrl || item.beforeUrl || '';
      const after = item.afterImageUrl || item.afterUrl || image;
      const media = before && after ? `<div class="before-after"><img src="${esc(before)}" alt="Before ${esc(item.title || 'project')}"><img src="${esc(after)}" alt="After ${esc(item.title || 'project')}"></div>` : image ? `<img src="${esc(image)}" alt="${esc(item.title || 'Completed project')}">` : `<div class="gallery-gradient"></div>`;
      return `<button class="job-photo-card premium-reveal" type="button" data-lightbox-src="${esc(after || image)}" data-lightbox-title="${esc(item.title || 'Recent project')}">${media}<span><strong>${esc(item.title || 'Recent project')}</strong><em>${esc(item.caption || item.description || 'Completed work with a clean client workflow.')}</em></span></button>`;
    }).join('');
  };

  const bindLightbox = () => {
    document.querySelectorAll('[data-lightbox-src]').forEach((buttonEl) => {
      if (buttonEl.dataset.bound === '1') return;
      buttonEl.dataset.bound = '1';
      buttonEl.addEventListener('click', () => {
        const src = buttonEl.dataset.lightboxSrc;
        if (!src) return;
        const overlay = document.createElement('div');
        overlay.className = 'homepage-lightbox';
        overlay.innerHTML = `<button type="button" aria-label="Close gallery">×</button><figure><img src="${esc(src)}" alt="${esc(buttonEl.dataset.lightboxTitle || 'Project photo')}"><figcaption>${esc(buttonEl.dataset.lightboxTitle || '')}</figcaption></figure>`;
        overlay.querySelector('button').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
        document.body.append(overlay);
      });
    });
  };

  const updatePortalLink = () => {
    document.querySelectorAll('[data-dashboard-link]').forEach((link) => { link.href = '/login/'; });
  };

  const renderDynamic = (settings, gallery, company = {}) => {
    const root = document.getElementById('homepage-dynamic-sections');
    if (!root) return;
    const visible = settings.sectionVisibility || {};
    const galleryHtml = galleryCards(gallery);
    root.innerHTML = `
      <section class="hero premium-landing-hero customer-landing-hero homepage-hero">
        <div class="container hero-grid">
          <div class="hero-copy premium-reveal">
            ${logoMarkup(company, settings)}
            <span class="pill hero-pill">${esc(settings.heroBadge)}</span>
            <h1>${esc(settings.heroHeadline)}</h1>
            <p>${esc(settings.heroSubheadline)}</p>
            <div class="hero-actions">${button(settings.primaryButtonText, settings.primaryButtonLink)}${settings.showSecondaryButton === false ? '' : button(settings.secondaryButtonText, settings.secondaryButtonLink, true)}</div>
            <div class="hero-metrics trust-badges"><span>✓ Locally Owned</span><span>✓ AI Photo Estimates</span><span>✓ Residential & Commercial</span><span>✓ Fast Quote Turnaround</span></div>
          </div>
          <aside class="contractor-command-visual premium-reveal product-mockup" aria-label="Premium estimate workflow preview">
            <div class="mockup-glow"></div>
            <div class="work-order-card main premium-estimate-card"><small>Current estimate</small><h3>Kitchen Ceiling Repair</h3><ul><li>✓ Photos Uploaded</li><li>✓ AI Reviewed</li><li>✓ Quote Ready</li></ul><strong>$425 - $680</strong><p>Worker Assigned</p></div>
            <div class="ai-preview-card"><span>AI analysis</span><strong>91% confidence</strong><em>Ceiling tile · Framing · Paint touch-up</em></div>
            <div class="floating-trade-card trade-hvac">HVAC</div><div class="floating-trade-card trade-electric">Electrical</div><div class="floating-trade-card trade-plumb">Plumbing</div><div class="floating-trade-card trade-handyman">Handyman</div>
          </aside>
        </div>
      </section>
      ${visible.trust !== false ? `<section class="section trust-bar-section"><div class="container trust-bar">${cardList(settings.trustCards, 'trust-card')}</div></section>` : ''}
      ${visible.services !== false ? `<section class="section services-premium-section" id="services"><div class="container"><div class="section-heading centered premium-reveal"><span class="pill">Services</span><h2>${esc(settings.servicesTitle)}</h2><p>${esc(settings.servicesSubtitle)}</p></div><div class="customer-service-grid">${serviceCards(settings)}</div></div></section>` : ''}
      ${visible.previousJobs !== false && galleryHtml ? `<section class="section recent-work-section" id="recent-work"><div class="container"><div class="section-heading premium-reveal"><span class="pill">Previous Work</span><h2>Recent work with before/after-ready detail.</h2><p>Mini splits, water heaters, drywall, painting, electrical, ceiling fans, and general repairs managed from the homepage editor.</p></div><div class="job-photo-grid masonry-grid">${galleryHtml}</div></div></section>` : ''}
      ${visible.howItWorks !== false ? `<section class="section how-it-works-section" id="process"><div class="container"><div class="section-heading centered premium-reveal"><span class="pill">Workflow</span><h2>${esc(settings.howItWorksTitle)}</h2><p>${esc(settings.howItWorksText)}</p></div><div class="visual-pipeline">${sorted(settings.howItWorksSteps).filter((step)=>step.visible!==false).map((step, i)=>`<article class="pipeline-step premium-reveal"><span>${i + 1}</span><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p></article>`).join('')}</div></div></section>` : ''}
      ${settings.showAbout !== false && visible.about !== false ? `<section class="section about-section" id="about"><div class="container grid grid-2"><div class="premium-reveal"><span class="pill">About</span><h2>${esc(settings.aboutTitle)}</h2><p>${esc(settings.aboutText)}</p>${settings.aboutText2 ? `<p>${esc(settings.aboutText2)}</p>` : ''}</div><div class="premium-proof-card premium-reveal"><strong>${esc(settings.yearsExperienceText)}</strong><p>${esc(settings.localText)}</p><div class="mini-trust-row"><span>Organized</span><span>Professional</span><span>Modern</span></div></div></div></section>` : ''}
      ${visible.whyChoose !== false ? `<section class="section why-section" id="why-choose-us"><div class="container"><div class="section-heading centered premium-reveal"><span class="pill">Why Choose Us</span><h2>${esc(settings.whyChooseTitle)}</h2></div><div class="grid grid-3">${cardList(settings.whyChooseCards, 'why-card')}</div></div></section>` : ''}
      ${visible.serviceArea !== false ? `<section class="section service-area-section" id="service-area"><div class="container grid grid-2"><div class="premium-reveal"><span class="pill">Service area</span><h2>${esc(settings.serviceAreaTitle)}</h2><p>${esc(settings.serviceAreaText)}</p>${settings.travelNotes ? `<p>${esc(settings.travelNotes)}</p>` : ''}</div><div class="area-card premium-reveal">${settings.citiesServed.map((city) => `<strong>${esc(city)}</strong>`).join('')}</div></div></section>` : ''}
      <section class="section estimate-premium-section" id="estimate">${document.getElementById('estimate-template')?.innerHTML || ''}</section>
      ${visible.cta !== false ? `<section class="section contact-cta-section" id="contact"><div class="container final-customer-cta premium-reveal"><h2>${esc(settings.ctaHeadline)}</h2><p>${esc(settings.ctaSubheadline)}</p><div class="hero-actions">${button(settings.ctaButtonText, settings.ctaButtonLink)}</div></div></section>` : ''}`;
    bindLightbox();
    window.TAEstimateWizard?.bind?.();
    const footer = document.querySelector('[data-dynamic-footer]');
    const name = company.displayName || company.companyName || 'TA Contracting';
    if (footer) footer.innerHTML = visible.contactFooter === false ? '' : `<div class="container footer-premium footer-grid-customer"><div>${logoMarkup(company, settings)}<p>${esc(settings.footerText)}</p>${settings.licenseText ? `<small>License: ${esc(settings.licenseText)}</small>` : ''}</div><div><h3>Contact</h3>${settings.footerPhone ? `<a href="tel:${esc(settings.footerPhone)}">${esc(settings.footerPhone)}</a>` : ''}${settings.footerEmail ? `<a href="mailto:${esc(settings.footerEmail)}">${esc(settings.footerEmail)}</a>` : ''}<a href="/login/" data-portal-link>Client Portal</a><a href="#estimate">Request Estimate</a></div><div><h3>Service Area</h3><p>${esc(settings.footerAddress || settings.citiesServed.join(', '))}</p><p>© ${new Date().getFullYear()} ${esc(name)}. All rights reserved.</p></div></div>`;
    window.TACompany?.apply?.(company || window.TACompany.current || window.TACompany.fallback || {});
    window.TATheme?.apply?.(company || window.TACompany?.current || {});
    document.dispatchEvent(new CustomEvent('ta:homepage-rendered'));
  };

  document.addEventListener('DOMContentLoaded', async () => {
    let company = window.TACompany?.current || {};
    try { company = await window.TACompany?.load?.() || company; } catch {}
    let settings = buildDefaults(company), gallery = [];
    try { const data = await window.TAApi.get('/.netlify/functions/homepage-settings'); const loaded = data.settings || data.homepage || data; settings = loaded?.id ? merge(loaded, company) : merge({}, company); } catch { settings = merge({}, company); }
    try { const data = await window.TAApi.get('/.netlify/functions/homepage-gallery'); gallery = data.gallery || []; } catch { gallery = []; }
    renderDynamic(settings, gallery, company);
    updatePortalLink();
  });
})();

document.addEventListener('scroll', () => {
  document.body.classList.toggle('scrolled', window.scrollY > 28);
}, { passive: true });
