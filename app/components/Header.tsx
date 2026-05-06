import Link from "next/link";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Client Login" },
];

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="T&A Contracting home">
        <span className="brand-badge">T&A</span>
        <span>
          <strong>T&A Contracting</strong>
          <small>Maintenance. Anything. Everything.</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map((link) => (
          <Link href={link.href} key={link.href}>{link.label}</Link>
        ))}
      </nav>
      <Link className="button header-button" href="/request-estimate">Request Estimate</Link>
    </header>
  );
}
