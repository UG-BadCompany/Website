import Link from "next/link";

const links = [
  { href: "/services", label: "Services" },
  { href: "/request-estimate", label: "Request Estimate" },
  { href: "/login", label: "Client Portal / Dashboard" },
];

export function Header() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="T&A Contracting home">
        <img className="brand-logo" src="https://raw.githubusercontent.com/UG-BadCompany/images/refs/heads/main/website%20logos/logo3.png" alt="T&A Contracting logo" />
        <span>
          <strong>T&A Contracting</strong>
          <small>Repair • Maintenance • Improvements</small>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
      </nav>
      <Link className="button header-button" href="/request-estimate">Request Estimate</Link>
    </header>
  );
}
