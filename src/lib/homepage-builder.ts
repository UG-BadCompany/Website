import type { BrandingSettings } from './branding';

export type HomepageSectionType =
  | 'hero' | 'services-grid' | 'service-detail-cards' | 'about' | 'why-choose-us' | 'trust-badges'
  | 'before-after-gallery' | 'testimonials' | 'faq' | 'call-to-action' | 'contact-block'
  | 'service-area' | 'emergency-banner' | 'financing-banner' | 'process-steps' | 'stats-numbers'
  | 'team-owner-intro' | 'featured-projects' | 'logo-brand-strip' | 'custom-rich-text'
  | 'custom-image-text' | 'request-estimate-form';

export type HomepageButton = { id: string; label: string; href: string; style?: 'primary' | 'secondary' | 'ghost' };
export type HomepageMedia = { id?: string; url: string; alt?: string; visibility?: 'public' | 'private' };
export type HomepageItem = { id: string; title: string; text?: string; icon?: string; image?: HomepageMedia; label?: string; value?: string; href?: string };
export type HomepageSectionContent = {
  heading?: string; subheading?: string; body?: string; eyebrow?: string; buttons?: HomepageButton[];
  image?: HomepageMedia; images?: HomepageMedia[]; items?: HomepageItem[]; richText?: string; phone?: string; email?: string; address?: string;
};
export type HomepageSectionStyles = {
  backgroundColor?: string; backgroundImage?: HomepageMedia; textColor?: string; accentColor?: string; cardStyle?: 'flat' | 'bordered' | 'elevated' | 'glass';
  borderRadius?: number; spacingTop?: number; spacingBottom?: number; maxWidth?: number; alignment?: 'left' | 'center' | 'right';
  layoutVariant?: string; columns?: number; overlayOpacity?: number; cardShadow?: boolean;
};
export type HomepageVisibility = { desktop: boolean; tablet: boolean; mobile: boolean; public: boolean; scheduledPublishAt?: string };
export type HomepageSection = {
  id: string; type: HomepageSectionType; title: string; enabled: boolean; order: number; content: HomepageSectionContent; styles: HomepageSectionStyles; visibility: HomepageVisibility;
  advanced: { anchorId?: string; cssClass?: string; seoLabel?: string }; createdAt: string; updatedAt: string;
};
export type HomepageGlobalStyles = {
  maxPageWidth: number; sectionSpacingDefault: number; buttonStyle: 'rounded' | 'pill' | 'square'; cardRadius: number; background: string; fontStyle: string;
  header: { heroUnderHeader: boolean; transparentHeader: boolean; stickyEstimateCta: boolean };
  footer: { showContactInfo: boolean; showServiceArea: boolean; showBusinessHours: boolean };
};
export type HomepageSeo = { title: string; description: string; socialTitle: string; socialDescription: string; socialImage?: HomepageMedia };
export type HomepageDraft = { sections: HomepageSection[]; globalStyles: HomepageGlobalStyles; seo: HomepageSeo };
export type HomepageVersion = HomepageDraft & { id: string; pageId?: string; status: 'draft' | 'published' | 'archived'; name: string; createdAt: string; publishedAt?: string; createdBy?: string };
export type HomepageBuilderResponse = { ok: boolean; page: Record<string, unknown>; draft: HomepageDraft; published: HomepageDraft | null; versions: HomepageVersion[] };

export const sectionTypeLabels: Record<HomepageSectionType, string> = {
  'hero': 'Hero', 'services-grid': 'Services Grid', 'service-detail-cards': 'Service Detail Cards', 'about': 'About', 'why-choose-us': 'Why Choose Us', 'trust-badges': 'Trust / Badges',
  'before-after-gallery': 'Before & After Gallery', testimonials: 'Testimonials', faq: 'FAQ', 'call-to-action': 'Call To Action', 'contact-block': 'Contact Block', 'service-area': 'Service Area',
  'emergency-banner': 'Emergency Banner', 'financing-banner': 'Financing Banner', 'process-steps': 'Process / Steps', 'stats-numbers': 'Stats / Numbers', 'team-owner-intro': 'Team / Owner Intro',
  'featured-projects': 'Featured Projects', 'logo-brand-strip': 'Logo / Brand Strip', 'custom-rich-text': 'Custom Text / Rich Content', 'custom-image-text': 'Custom Image + Text', 'request-estimate-form': 'Request Estimate Form Embed',
};

export const defaultGlobalStyles: HomepageGlobalStyles = { maxPageWidth: 1180, sectionSpacingDefault: 88, buttonStyle: 'pill', cardRadius: 24, background: '#f6f3ee', fontStyle: 'Inter/System', header: { heroUnderHeader: true, transparentHeader: false, stickyEstimateCta: true }, footer: { showContactInfo: true, showServiceArea: true, showBusinessHours: true } };
export const defaultSeo: HomepageSeo = { title: 'Contractor Services', description: 'Request service from a trusted local contractor.', socialTitle: 'Contractor Services', socialDescription: 'Fast estimates, expert work, and clear communication.' };

const now = () => new Date().toISOString();
export function makeSection(type: HomepageSectionType, patch: Partial<HomepageSection> = {}): HomepageSection {
  const stamp = now();
  const base: HomepageSection = { id: crypto.randomUUID(), type, title: sectionTypeLabels[type], enabled: true, order: 0, content: defaultContent(type), styles: defaultStyles(type), visibility: { desktop: true, tablet: true, mobile: true, public: true }, advanced: { seoLabel: sectionTypeLabels[type] }, createdAt: stamp, updatedAt: stamp };
  return { ...base, ...patch, content: { ...base.content, ...(patch.content || {}) }, styles: { ...base.styles, ...(patch.styles || {}) }, visibility: { ...base.visibility, ...(patch.visibility || {}) }, advanced: { ...base.advanced, ...(patch.advanced || {}) } };
}

export function normalizeSections(sections?: HomepageSection[]): HomepageSection[] {
  return Array.isArray(sections) ? sections.map((s, index) => makeSection((s.type || 'custom-rich-text') as HomepageSectionType, { ...s, order: index })).sort((a, b) => a.order - b.order) : [];
}

function defaultStyles(type: HomepageSectionType): HomepageSectionStyles {
  const dark = type === 'hero' || type === 'emergency-banner';
  return { backgroundColor: dark ? '#17120f' : '#ffffff', textColor: dark ? '#fff8ed' : '#201a16', accentColor: '#b96b2b', cardStyle: 'elevated', borderRadius: 24, spacingTop: type === 'hero' ? 104 : 78, spacingBottom: type === 'hero' ? 104 : 78, maxWidth: 1180, alignment: type.includes('banner') || type === 'call-to-action' ? 'center' : 'left', layoutVariant: type === 'hero' ? 'split' : 'standard', columns: type.includes('grid') ? 3 : 2, overlayOpacity: 35, cardShadow: true };
}
function defaultContent(type: HomepageSectionType): HomepageSectionContent {
  const sharedButtons = [{ id: crypto.randomUUID(), label: 'Request Estimate', href: '/request-estimate', style: 'primary' as const }, { id: crypto.randomUUID(), label: 'Call Now', href: 'tel:+16025550100', style: 'secondary' as const }];
  const services = ['HVAC Repair', 'Plumbing', 'Electrical', 'Maintenance'].map((title) => ({ id: crypto.randomUUID(), title, text: 'Professional diagnostics, clear options, and clean workmanship.', icon: 'Wrench' }));
  if (type === 'hero') return { eyebrow: 'Licensed • Insured • Local', heading: 'Premium contractor service without the runaround', subheading: 'Fast estimates, expert crews, and a customer portal that keeps every job moving.', body: 'Customize every headline, image, button, and service block from ContractorOS.', buttons: sharedButtons };
  if (type === 'services-grid' || type === 'service-detail-cards') return { heading: 'Services built around your property', subheading: 'Residential and commercial service categories', items: services };
  if (type === 'faq') return { heading: 'Frequently asked questions', items: ['How fast can you come out?', 'Do you offer financing?', 'Are you licensed and insured?'].map((title) => ({ id: crypto.randomUUID(), title, text: 'Edit this answer in the right panel.' })) };
  if (type === 'testimonials') return { heading: 'Customers trust our crew', items: ['Professional from quote to cleanup', 'The fastest emergency response we have had', 'Clear pricing and excellent communication'].map((title) => ({ id: crypto.randomUUID(), title, text: '★★★★★', label: 'Customer' })) };
  if (type === 'stats-numbers') return { heading: 'Proven field performance', items: [{ id: crypto.randomUUID(), title: 'Projects', value: '1,200+', text: 'completed' }, { id: crypto.randomUUID(), title: 'Response', value: '24/7', text: 'emergency availability' }, { id: crypto.randomUUID(), title: 'Satisfaction', value: '98%', text: 'customer approval' }] };
  if (type === 'process-steps') return { heading: 'A simple service process', items: ['Request', 'Inspect', 'Approve', 'Schedule', 'Complete'].map((title, i) => ({ id: crypto.randomUUID(), title: `${i + 1}. ${title}`, text: 'Keep customers informed at every step.' })) };
  if (type === 'request-estimate-form') return { heading: 'Request your estimate', body: 'Embed the ContractorOS public request-estimate intake flow directly on the homepage.', buttons: [{ id: crypto.randomUUID(), label: 'Start Request', href: '/request-estimate', style: 'primary' }] };
  if (type === 'contact-block') return { heading: 'Talk with the office', phone: '(602) 555-0100', email: 'office@example.com', address: 'Phoenix, AZ', buttons: sharedButtons.slice(0, 1) };
  return { heading: sectionTypeLabels[type], subheading: 'Editable premium homepage section', body: 'Use the builder to change copy, cards, media, spacing, backgrounds, visibility, and links.', buttons: type.includes('banner') || type === 'call-to-action' ? sharedButtons.slice(0, 1) : [] };
}

export function sectionLibrary(): Array<{ id: string; group: string; name: string; description: string; section: HomepageSection }> {
  const entries: Array<[string, string, HomepageSectionType, Partial<HomepageSection>]> = [
    ['Hero presets', 'Split image hero', 'hero', { styles: { layoutVariant: 'split' } }], ['Hero presets', 'Centered hero', 'hero', { styles: { layoutVariant: 'centered', alignment: 'center' } }], ['Hero presets', 'Dark overlay hero', 'hero', { styles: { layoutVariant: 'overlay', backgroundColor: '#090807' } }], ['Hero presets', 'Emergency service hero', 'hero', { title: 'Emergency Hero', content: { eyebrow: '24/7 Emergency Service', heading: 'Emergency help from a real local crew' } }],
    ['Services presets', '3-card services', 'services-grid', { styles: { columns: 3 } }], ['Services presets', 'Icon grid', 'services-grid', { styles: { layoutVariant: 'icon-grid', columns: 4 } }], ['Services presets', 'Trade category grid', 'services-grid', {}], ['Services presets', 'Featured service cards', 'service-detail-cards', {}],
    ['CTA presets', 'Phone call CTA', 'call-to-action', { content: { heading: 'Need help today?', buttons: [{ id: crypto.randomUUID(), label: 'Call the Office', href: 'tel:+16025550100', style: 'primary' }] } }], ['CTA presets', 'Request estimate CTA', 'call-to-action', {}], ['CTA presets', 'Emergency banner CTA', 'emergency-banner', {}],
    ['Gallery presets', 'Before/after two-column', 'before-after-gallery', { styles: { columns: 2 } }], ['Gallery presets', 'Project cards', 'featured-projects', {}], ['Gallery presets', 'Image carousel shell', 'before-after-gallery', { styles: { layoutVariant: 'carousel' } }],
  ];
  const allTypes = (Object.keys(sectionTypeLabels) as HomepageSectionType[]).map((type) => ['All sections', sectionTypeLabels[type], type, {}] as [string, string, HomepageSectionType, Partial<HomepageSection>]);
  return [...entries, ...allTypes].map(([group, name, type, patch], index) => ({ id: `${group}-${name}-${index}`, group, name, description: `Add an editable ${name.toLowerCase()} block.`, section: makeSection(type, { title: name, ...patch }) }));
}

export function pageTemplates(branding?: Partial<BrandingSettings>): Array<{ id: string; name: string; description: string; draft: HomepageDraft }> {
  const company = branding?.displayName || branding?.companyDisplayName || branding?.companyName || 'Your Company';
  const mk = (id: string, name: string, types: HomepageSectionType[], dark = false): { id: string; name: string; description: string; draft: HomepageDraft } => ({
    id, name, description: `A full editable ${name.toLowerCase()} layout for ${company}.`, draft: { globalStyles: { ...defaultGlobalStyles, background: dark ? '#11100f' : id.includes('copper') ? '#f7efe5' : '#f7f7f5' }, seo: { ...defaultSeo, title: `${company} | ${name}`, socialTitle: `${company} ${name}` }, sections: types.map((type, order) => makeSection(type, { order, content: order === 0 ? { ...defaultContent(type), heading: `${company} — ${defaultContent(type).heading}` } : defaultContent(type), styles: { ...defaultStyles(type), ...(dark ? { backgroundColor: order % 2 ? '#1f1a17' : '#11100f', textColor: '#fff7ec', accentColor: '#d49a5f' } : {}) } })) }
  });
  return [
    mk('contractor-classic', 'Contractor Classic', ['hero','trust-badges','services-grid','about','process-steps','testimonials','call-to-action','contact-block']),
    mk('modern-service-company', 'Modern Service Company', ['hero','stats-numbers','service-detail-cards','why-choose-us','featured-projects','faq','request-estimate-form']),
    mk('premium-dark', 'Premium Dark', ['hero','services-grid','before-after-gallery','stats-numbers','testimonials','call-to-action'], true),
    mk('arizona-copper', 'Arizona Copper', ['hero','services-grid','service-area','team-owner-intro','financing-banner','contact-block']),
    mk('clean-light', 'Clean Light', ['hero','about','services-grid','process-steps','faq','call-to-action']),
    mk('emergency-service', 'Emergency Service', ['emergency-banner','hero','services-grid','stats-numbers','testimonials','contact-block']),
    mk('commercial-maintenance', 'Commercial Maintenance', ['hero','logo-brand-strip','service-detail-cards','process-steps','stats-numbers','request-estimate-form']),
    mk('minimal-one-page', 'Minimal One Page', ['hero','services-grid','about','contact-block']),
  ];
}

export function validateHomepage(draft: HomepageDraft): { critical: string[]; warnings: string[] } {
  const sections = normalizeSections(draft.sections);
  const critical: string[] = []; const warnings: string[] = [];
  if (!sections.some((s) => s.enabled && s.visibility.public)) critical.push('Publish requires at least one enabled public section.');
  const hero = sections.find((s) => s.type === 'hero' && s.enabled);
  if (hero && !hero.content.heading && !hero.content.image?.url && !hero.styles.backgroundImage?.url) critical.push('Hero sections need a heading or usable image.');
  for (const section of sections) {
    for (const button of section.content.buttons || []) if (button.label && !button.href) critical.push(`${section.title}: button "${button.label}" needs a link.`);
    const media = [section.content.image, section.styles.backgroundImage, ...(section.content.images || [])].filter(Boolean) as HomepageMedia[];
    media.forEach((image) => { if (!image.url) critical.push(`${section.title}: selected image is missing a URL.`); if (image.visibility === 'private') warnings.push(`${section.title}: private media should be made public for homepage use.`); });
  }
  if (!draft.seo?.title) warnings.push('SEO title is recommended before publishing.');
  if (!draft.seo?.description) warnings.push('SEO description is recommended before publishing.');
  return { critical, warnings };
}
