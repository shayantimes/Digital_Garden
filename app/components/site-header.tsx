"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { gardenSettings } from "../lib/garden-config";
import { CONTENT_EVENT, fetchGardenSettings } from "../lib/garden-content";

export function SiteHeader() {
  const pathname = usePathname();
  const [settings, setSettings] = useState(gardenSettings);

  useEffect(() => {
    const load = () => void fetchGardenSettings().then((result) => setSettings(result.settings)).catch(() => undefined);
    load();
    window.addEventListener(CONTENT_EVENT, load);
    return () => window.removeEventListener(CONTENT_EVENT, load);
  }, []);

  if (pathname === "/" || pathname.startsWith("/admin")) return null;

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
