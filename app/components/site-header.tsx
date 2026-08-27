"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { gardenSettings } from "../lib/garden-config";

export function SiteHeader() {
  const pathname = usePathname();
  const settings = gardenSettings;

  if (pathname === "/") return null;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="garden-title-link" href="/" aria-label={`${settings.headerName}'s garden, home`}>
          <span>{settings.headerName}&apos;s Garden</span>
          <small>Personal archive · growing in public</small>
        </Link>
        <nav className="header-section-menu" aria-label="Garden sections">
          {settings.categories.map((category) => {
            const href = `/${category.slug}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link className={active ? "header-section-active" : ""} href={href} key={category.id} aria-current={active ? "page" : undefined}>
                {category.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
