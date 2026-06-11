import { Link } from './Router';
import type { HomepageButton, HomepageDraft, HomepageItem, HomepageMedia, HomepageSection } from '../lib/homepage-builder';
import { normalizeSections } from '../lib/homepage-builder';

const deviceClass = (section: HomepageSection) => [
  section.visibility.desktop ? '' : 'hide-desktop',
  section.visibility.tablet ? '' : 'hide-tablet',
  section.visibility.mobile ? '' : 'hide-mobile',
].filter(Boolean).join(' ');

export function HomepageRenderer({ draft, editable = false, selectedId = '', onSelect, onTextChange, device = 'desktop' }: { draft: HomepageDraft; editable?: boolean; selectedId?: string; onSelect?: (id: string) => void; onTextChange?: (id: string, key: 'heading' | 'subheading' | 'body', value: string) => void; device?: 'desktop' | 'tablet' | 'mobile' }) {
  const sections = normalizeSections(draft.sections).filter((section) => section.enabled && section.visibility.public);
  return <div className={`homepage-renderer homepage-device-${device}`} style={{ background: draft.globalStyles?.background || '#f7f4ef', ['--homepage-max' as string]: `${draft.globalStyles?.maxPageWidth || 1180}px`, ['--homepage-radius' as string]: `${draft.globalStyles?.cardRadius || 24}px` }}>
    {sections.length ? sections.map((section) => <RenderedSection key={section.id} section={section} editable={editable} selected={selectedId === section.id} onSelect={onSelect} onTextChange={onTextChange}/>) : <section className="public-home-section"><div className="public-home-inner empty-render">No published homepage sections yet.</div></section>}
  </div>;
}

function RenderedSection({ section, editable, selected, onSelect, onTextChange }: { section: HomepageSection; editable: boolean; selected: boolean; onSelect?: (id: string) => void; onTextChange?: (id: string, key: 'heading' | 'subheading' | 'body', value: string) => void }) {
  const s = section.styles || {};
  const style = {
    backgroundColor: s.backgroundColor || '#fff', color: s.textColor || '#201a16', paddingTop: `${s.spacingTop ?? 72}px`, paddingBottom: `${s.spacingBottom ?? 72}px`,
    backgroundImage: s.backgroundImage?.url ? `linear-gradient(rgba(0,0,0,${(s.overlayOpacity || 0) / 100}), rgba(0,0,0,${(s.overlayOpacity || 0) / 100})), url(${s.backgroundImage.url})` : undefined,
  };
  const className = `public-home-section type-${section.type} ${deviceClass(section)} ${selected ? 'builder-selected-section' : ''} ${section.advanced.cssClass || ''}`;
  return <section id={section.advanced.anchorId || undefined} className={className} style={style} onClick={(event) => { if (editable) { event.stopPropagation(); onSelect?.(section.id); } }}>
    <div className={`public-home-inner align-${s.alignment || 'left'} variant-${s.layoutVariant || 'standard'}`} style={{ maxWidth: s.maxWidth || 'var(--homepage-max)' }}>
      <SectionBody section={section} editable={editable} onTextChange={onTextChange}/>
    </div>
  </section>;
}

function EditableText({ section, field, as = 'p', children, editable, onTextChange }: { section: HomepageSection; field: 'heading' | 'subheading' | 'body'; as?: 'h1' | 'h2' | 'p' | 'div'; children?: string; editable: boolean; onTextChange?: (id: string, key: 'heading' | 'subheading' | 'body', value: string) => void }) {
  const Tag = as;
  return <Tag contentEditable={editable} suppressContentEditableWarning className={editable ? 'inline-editable' : undefined} onBlur={(event) => editable && onTextChange?.(section.id, field, event.currentTarget.textContent || '')}>{children}</Tag>;
}

function SectionBody({ section, editable, onTextChange }: { section: HomepageSection; editable: boolean; onTextChange?: (id: string, key: 'heading' | 'subheading' | 'body', value: string) => void }) {
  const c = section.content || {}; const s = section.styles || {}; const items = Array.isArray(c.items) ? c.items : [];
  const headingTag = section.type === 'hero' ? 'h1' : 'h2';
  if (section.type === 'hero') return <div className="home-hero-layout"><div className="home-copy">{c.eyebrow && <p className="home-eyebrow">{c.eyebrow}</p>}{c.heading && <EditableText section={section} field="heading" as={headingTag} editable={editable} onTextChange={onTextChange}>{c.heading}</EditableText>}{c.subheading && <EditableText section={section} field="subheading" editable={editable} onTextChange={onTextChange}>{c.subheading}</EditableText>}<ButtonRow buttons={c.buttons}/></div><MediaFrame image={c.image} fallback="Fast local service"/></div>;
  if (section.type === 'request-estimate-form') return <div className="estimate-embed"><Header section={section} editable={editable} onTextChange={onTextChange}/><div className="mini-form"><input placeholder="Name"/><input placeholder="Phone"/><input placeholder="Service needed"/><Link href="/request-estimate" className="button">Open full estimate form</Link></div></div>;
  if (section.type === 'contact-block') return <div><Header section={section} editable={editable} onTextChange={onTextChange}/><div className="home-card-grid cols-3"><InfoCard title="Call" text={c.phone || 'Phone coming soon'}/><InfoCard title="Email" text={c.email || 'Email coming soon'}/><InfoCard title="Visit" text={c.address || 'Service address coming soon'}/></div><ButtonRow buttons={c.buttons}/></div>;
  if (section.type === 'custom-image-text') return <div className="home-split"><MediaFrame image={c.image}/><div><Header section={section} editable={editable} onTextChange={onTextChange}/><ButtonRow buttons={c.buttons}/></div></div>;
  if (section.type === 'custom-rich-text') return <div><Header section={section} editable={editable} onTextChange={onTextChange}/><div className="rich-content" dangerouslySetInnerHTML={{ __html: c.richText || c.body || '' }}/></div>;
  if (section.type === 'call-to-action' || section.type === 'emergency-banner' || section.type === 'financing-banner') return <div className="home-cta"><Header section={section} editable={editable} onTextChange={onTextChange}/><ButtonRow buttons={c.buttons}/></div>;
  if (section.type === 'before-after-gallery' || section.type === 'featured-projects') return <div><Header section={section} editable={editable} onTextChange={onTextChange}/><div className={`home-gallery cols-${s.columns || 2}`}>{(c.images?.length ? c.images : [undefined, undefined, undefined]).map((image, index) => <MediaFrame key={image?.url || index} image={image} fallback={index % 2 ? 'After' : 'Before'}/>)}</div></div>;
  if (section.type === 'logo-brand-strip') return <div><Header section={section} editable={editable} onTextChange={onTextChange}/><div className="logo-strip">{(items.length ? items : [{ id: '1', title: 'Licensed' }, { id: '2', title: 'Insured' }, { id: '3', title: 'Warranty' }]).map((item) => <span key={item.id}>{item.title}</span>)}</div></div>;
  return <div><Header section={section} editable={editable} onTextChange={onTextChange}/><CardGrid items={items} columns={s.columns || 3}/><ButtonRow buttons={c.buttons}/></div>;
}
function Header({ section, editable, onTextChange }: { section: HomepageSection; editable: boolean; onTextChange?: (id: string, key: 'heading' | 'subheading' | 'body', value: string) => void }) { const c = section.content; return <div className="home-section-head">{c.eyebrow && <p className="home-eyebrow">{c.eyebrow}</p>}{c.heading && <EditableText section={section} field="heading" as="h2" editable={editable} onTextChange={onTextChange}>{c.heading}</EditableText>}{c.subheading && <EditableText section={section} field="subheading" editable={editable} onTextChange={onTextChange}>{c.subheading}</EditableText>}{c.body && <EditableText section={section} field="body" editable={editable} onTextChange={onTextChange}>{c.body}</EditableText>}</div>; }
function ButtonRow({ buttons = [] }: { buttons?: HomepageButton[] }) { if (!buttons.length) return null; return <div className="home-buttons">{buttons.map((button) => <Link key={button.id} href={button.href || '#'} className={`button ${button.style === 'secondary' ? 'secondary' : button.style === 'ghost' ? 'ghost' : ''}`}>{button.label || 'Button'}</Link>)}</div>; }
function CardGrid({ items, columns }: { items: HomepageItem[]; columns: number }) { const safe = items.length ? items : [{ id: 'empty', title: 'Editable card', text: 'Add list items/cards from the selected section settings.' }]; return <div className={`home-card-grid cols-${columns}`}>{safe.map((item) => <InfoCard key={item.id} title={item.value ? `${item.value} ${item.title}` : item.title} text={item.text || item.label || ''} icon={item.icon}/>)}</div>; }
function InfoCard({ title, text, icon }: { title: string; text?: string; icon?: string }) { return <article className="home-card"><span className="home-card-icon">{icon || '✦'}</span><h3>{title}</h3>{text && <p>{text}</p>}</article>; }
function MediaFrame({ image, fallback = 'Project image' }: { image?: HomepageMedia; fallback?: string }) { return <div className="home-media-frame">{image?.url ? <img src={image.url} alt={image.alt || fallback}/> : <div className="media-placeholder">{fallback}</div>}</div>; }
