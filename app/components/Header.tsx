import Link from "next/link";

const navItems = [
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
        <span className="brand-mark">T&A</span>
        <span>
          <strong>T&A Contracting</strong>
          <small>Maintenance. Anything. Everything.</small>
        </span>
      </Link>
      <nav aria-label="Main navigation">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link className="button button-small" href="/request-estimate">
        Request Estimate
      </Link>
    </header>
  );
}
