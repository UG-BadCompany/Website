(() => {
  const SERVICE_CATEGORIES = ['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements','Other / Not Sure'];
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const buildDefaults = (company = window.TACompany?.current || {}) => {
    const companyName = company.displayName || company.companyName || 'Your Company';
    const serviceArea = company.serviceArea || 'your service area';
    const phone = company.supportPhone || company.businessPhone || '';
    const email = company.supportEmail || '';
    return {
    heroHeadline: `Reliable maintenance, repairs, and improvements for ${serviceArea}.`,
    heroSubheadline: `${companyName} helps homeowners, landlords, property managers, and small businesses handle repairs, maintenance, installations, punch lists, and property improvements.`,
    primaryButtonText: 'Request Estimate', primaryButtonLink: '#estimate', secondaryButtonText: 'View Services', secondaryButtonLink: '#services', showSecondaryButton: true, heroBackgroundUrl: '',
    servicesTitle: 'Repair, maintenance, installation, and property work made easier to request.', servicesSubtitle: 'Choose the closest category when you request an estimate. If you are not sure, choose Other / Not Sure and describe the issue.',
    servicesConfig: SERVICE_CATEGORIES.map((name, index) => ({ name, description: `${name} support for repairs, maintenance, installations, and property improvement requests.`, enabled: true, sortOrder: index + 1 })),
    aboutTitle: `About ${companyName}`, aboutText: `We help ${serviceArea} homeowners, property managers, and small businesses handle the repairs, installs, and maintenance work that keep properties safe, clean, and running right.`, aboutText2: '', yearsExperienceText: '', localText: `Local property service support for ${serviceArea}.`, showAbout: true,
    whyChooseTitle: `Why choose ${companyName}`,
    whyChooseCards: [
      ['💬','Clear communication','Know what happens next with practical updates.'], ['📅','Reliable scheduling','We coordinate work around property needs and access.'], ['🛠️','Practical repair solutions','Repair-first thinking with replacement when it makes sense.'], ['🏗️','Maintenance and install experience','Support for punch lists, installs, and ongoing property needs.'], ['📲','Easy online requests','Send the details from phone or desktop.'], ['📸','Photos and job updates','Useful documentation before, during, and after work.']
    ].map(([icon,title,description], index) => ({ icon, title, description, visible: true, sortOrder: index + 1 })),
    serviceAreaTitle: `Serving ${serviceArea}.`, serviceAreaText: `Submit your request and ${companyName} will confirm availability for your property.`, citiesServed: serviceArea && serviceArea !== 'your service area' ? serviceArea.split(',').map((city) => city.trim()).filter(Boolean) : ['Local service area','Nearby communities'], travelNotes: '',
    ctaHeadline: 'Need help with a repair or project?', ctaSubheadline: 'Request an estimate and we’ll follow up with the next steps.', ctaButtonText: 'Request Estimate', ctaButtonLink: '#estimate',
    footerText: `Customer-focused repair, maintenance, installation, punch-list, and property improvement help from ${companyName}.`, footerPhone: phone, footerEmail: email, footerAddress: serviceArea, socialLinks: {}, licenseText: '',
    sectionVisibility: { hero:true, services:true, about:true, whyChoose:true, previousJobs:true, serviceArea:true, cta:true, contactFooter:true },
  };
  };
  const defaults = buildDefaults();
  window.TAHomepageDefaults = { SERVICE_CATEGORIES, defaults, buildDefaults };
  const merge = (settings = {}, company) => { const base = buildDefaults(company); return ({ ...base, ...settings, sectionVisibility: { ...base.sectionVisibility, ...(settings.sectionVisibility || {}) }, servicesConfig: Array.isArray(settings.servicesConfig) ? settings.servicesConfig : base.servicesConfig, whyChooseCards: Array.isArray(settings.whyChooseCards) ? settings.whyChooseCards : base.whyChooseCards, citiesServed: Array.isArray(settings.citiesServed) ? settings.citiesServed : base.citiesServed }); };
  const sorted = (items = []) => [...items].sort((a, b) => Number(a.sortOrder ?? a.sort_order ?? 0) - Number(b.sortOrder ?? b.sort_order ?? 0));
  const button = (text, link, secondary = false) => text && link ? `<a class="btn ${secondary ? 'secondary' : ''}" href="${esc(link)}">${esc(text)}</a>` : '';
  const serviceCards = (settings) => sorted(settings.servicesConfig).filter((item) => item.enabled !== false && SERVICE_CATEGORIES.includes(item.name)).map((item) => `<article class="card service-card"><span>${esc(item.name)}</span><h3>${esc(item.name)}</h3><p>${esc(item.description || `${item.name} support for your property.`)}</p></article>`).join('');
  const whyCards = (settings) => sorted(settings.whyChooseCards).filter((item) => item.visible !== false).map((item) => `<article class="card why-card"><strong>${esc(item.icon || '✓')}</strong><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></article>`).join('');
  const galleryCards = (gallery = []) => sorted(gallery).filter((item) => item.visible !== false && (item.imageUrl || item.image_url || item.beforeImageUrl || item.before_image_url || item.afterImageUrl || item.after_image_url)).map((item, index) => {
    const image = item.imageUrl || item.image_url || item.afterImageUrl || item.after_image_url || item.beforeImageUrl || item.before_image_url;
    const before = item.beforeImageUrl || item.before_image_url;
    const after = item.afterImageUrl || item.after_image_url;
    const slides = [image, before, after].filter(Boolean).filter((url, i, all) => all.indexOf(url) === i);
    return `<article class="card job-photo-card homepage-gallery-card" data-gallery-open="${index}">
      <div class="homepage-slideshow" data-homepage-slideshow>${slides.map((url, slideIndex) => `<img class="${slideIndex === 0 ? 'active' : ''}" src="${esc(url)}" alt="${esc(item.title || 'Previous job photo')}" loading="lazy" onerror="this.remove()">`).join('')}</div>
      ${before && after ? `<div class="before-after-strip"><img src="${esc(before)}" alt="Before ${esc(item.title || 'job photo')}" loading="lazy" onerror="this.remove()"><img src="${esc(after)}" alt="After ${esc(item.title || 'job photo')}" loading="lazy" onerror="this.remove()"></div>` : ''}
      <span>${esc(item.category || 'Previous Work')}${item.location ? ` • ${esc(item.location)}` : ''}</span><h3>${esc(item.title || 'Previous Work')}</h3><p>${esc(item.description || '')}</p>
    </article>`;
  }).join('');
  const updatePortalLink = async () => {
    const link = document.querySelector('[data-portal-link]');
    if (!link) return;
    let loggedIn = false;
    try { const res = await fetch('/api/me?optional=1', { credentials: 'include' }); const data = res.ok ? await res.json() : {}; loggedIn = Boolean(data.user || data.email || data.id); } catch {}
    link.href = loggedIn ? '/dashboard/' : '/login/';
    link.textContent = loggedIn ? 'Dashboard' : 'Client Portal';
  };
  const renderDynamic = (settings, gallery, company = window.TACompany?.current || {}) => {
    const mount = document.getElementById('homepage-dynamic-sections');
    if (!mount) return;
    const visible = settings.sectionVisibility || {};
    mount.innerHTML = `
      ${visible.hero !== false ? `<section class="hero premium-landing-hero customer-landing-hero homepage-hero" ${settings.heroBackgroundUrl ? `style="background-image:linear-gradient(120deg,rgba(2,6,23,.88),rgba(15,23,42,.72)),url('${esc(settings.heroBackgroundUrl)}')"` : ''}><div class="container hero-grid"><div class="hero-copy"><span class="pill">${esc(company.displayName || company.companyName || 'Your Company')} • ${esc(company.serviceArea || 'Property services')}</span><h1>${esc(settings.heroHeadline)}</h1><p>${esc(settings.heroSubheadline)}</p><p class="service-area-line">${esc(settings.serviceAreaTitle)}</p><p class="hero-actions">${button(settings.primaryButtonText, settings.primaryButtonLink)} ${settings.showSecondaryButton ? button(settings.secondaryButtonText, settings.secondaryButtonLink, true) : ''}</p></div><aside class="card customer-help-card"><span class="pill">Simple customer process</span><h2>One request starts the conversation.</h2><ul class="clean-list"><li>Tell us the property, work type, timeframe, and what is happening.</li><li>We review the scope and ask any needed follow-up questions.</li><li>You receive an estimate and can track updates in the client portal.</li></ul></aside></div></section>` : ''}
      ${visible.services !== false ? `<section class="section" id="services"><div class="container"><div class="section-heading centered"><span class="pill">Services</span><h2>${esc(settings.servicesTitle)}</h2><p>${esc(settings.servicesSubtitle)}</p></div><div class="grid grid-3 customer-service-grid">${serviceCards(settings)}</div></div></section>` : ''}
      ${settings.showAbout !== false && visible.about !== false ? `<section class="section about-section" id="about"><div class="container grid grid-2"><div><span class="pill">About</span><h2>${esc(settings.aboutTitle)}</h2><p>${esc(settings.aboutText)}</p>${settings.aboutText2 ? `<p>${esc(settings.aboutText2)}</p>` : ''}</div><div class="card stack"><strong>${esc(settings.yearsExperienceText || 'Property repairs, installs, and maintenance')}</strong><p>${esc(settings.localText || 'Local property service support.')}</p></div></div></section>` : ''}
      ${visible.whyChoose !== false ? `<section class="section why-section" id="why-choose-us"><div class="container"><div class="section-heading centered"><span class="pill">Why Choose Us</span><h2>${esc(settings.whyChooseTitle)}</h2></div><div class="grid grid-3">${whyCards(settings)}</div></div></section>` : ''}
      ${visible.previousJobs !== false && galleryCards(gallery) ? `<section class="section recent-work-section" id="recent-work"><div class="container"><div class="section-heading"><span class="pill">Previous Work</span><h2>Recent Projects</h2><p>Photos and short notes from repairs, maintenance, and improvements.</p></div><div class="grid grid-3 job-photo-grid">${galleryCards(gallery)}</div></div></section>` : ''}
      ${visible.serviceArea !== false ? `<section class="section service-area-section" id="service-area"><div class="container grid grid-2"><div><span class="pill">Service area</span><h2>${esc(settings.serviceAreaTitle)}</h2><p>${esc(settings.serviceAreaText)}</p>${settings.travelNotes ? `<p>${esc(settings.travelNotes)}</p>` : ''}</div><div class="card area-card">${settings.citiesServed.map((city) => `<strong>${esc(city)}</strong>`).join('')}</div></div></section>` : ''}
      <section class="section" id="estimate">${document.getElementById('estimate-template')?.innerHTML || ''}</section>
      ${visible.cta !== false ? `<section class="section contact-cta-section"><div class="container card final-customer-cta"><h2>${esc(settings.ctaHeadline)}</h2><p>${esc(settings.ctaSubheadline)}</p><p class="hero-actions">${button(settings.ctaButtonText, settings.ctaButtonLink)}</p></div></section>` : ''}`;
    document.querySelectorAll('[data-homepage-slideshow]').forEach((show) => { const slides = [...show.querySelectorAll('img')]; if (slides.length > 1) { let i = 0; setInterval(() => { slides[i]?.classList.remove('active'); i = (i + 1) % slides.length; slides[i]?.classList.add('active'); }, 3500); } });
    document.querySelectorAll('[data-gallery-open]').forEach((card) => card.addEventListener('click', () => {
      const img = card.querySelector('.homepage-slideshow img.active') || card.querySelector('img'); if (!img) return;
      const overlay = document.createElement('div'); overlay.className = 'homepage-lightbox'; overlay.innerHTML = `<button type="button" aria-label="Close preview">×</button><img src="${esc(img.src)}" alt="${esc(img.alt)}">`; overlay.onclick = () => overlay.remove(); document.body.appendChild(overlay);
    }));
    const footer = document.querySelector('[data-dynamic-footer]');
    if (footer) footer.innerHTML = visible.contactFooter === false ? '' : `<div class="container footer-premium footer-grid-customer"><div><h2><span data-company-name>${esc(company.displayName || company.companyName || 'Your Company')}</span></h2><p>${esc(settings.footerText)}</p>${settings.licenseText ? `<small>${esc(settings.licenseText)}</small>` : ''}</div><div><h3>Contact</h3>${settings.footerPhone ? `<a href="tel:${esc(settings.footerPhone)}">${esc(settings.footerPhone)}</a>` : ''}${settings.footerEmail ? `<a href="mailto:${esc(settings.footerEmail)}">${esc(settings.footerEmail)}</a>` : ''}${Object.entries(settings.socialLinks || {}).map(([label,url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`).join('')}<a href="#estimate">Request Estimate</a></div><div><h3>Service Area</h3><p>${esc(settings.footerAddress || settings.citiesServed.join(', '))}</p></div></div>`;
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
