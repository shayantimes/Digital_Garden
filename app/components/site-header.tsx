"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Shayan" },
  { href: "/projects", label: "Projects" },
  { href: "/writings", label: "Writings" },
  { href: "/hobbies", label: "Hobbies" },
  { href: "/now", label: "Now" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-nav">
      <nav className="nav-links" aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={pathname === item.href ? "nav-active" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="social-links" aria-label="Elsewhere">
        <a href="#cv">CV</a>
        <a href="#github">GitHub</a>
        <a href="#twitter">Twitter</a>
        <a href="#instagram">Instagram</a>
        <a href="#linkedin">LinkedIn</a>
      </nav>
    </header>
  );
}
