import Link from "next/link";

const links = [
  { href: "/services", label: "Features" },
  { href: "/about", label: "Platform" },
  { href: "/gallery", label: "Customers" },
  { href: "/contact", label: "Demo" },
  { href: "/login", label: "Login" },
];

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Contractor CMMS home">
        <img className="brand-logo" src="https://raw.githubusercontent.com/UG-BadCompany/images/refs/heads/main/website%20logos/logo3.png" alt="T&A Contracting logo" />
        <span>
          <strong>T&A Contracting</strong>
          <small>Contractor CMMS + AI Quoting</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
      </nav>
      <Link className="button header-button" href="/request-estimate">Start Free</Link>
    </header>
  );
}
