"use client";

import Link from "next/link";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { CtaButton } from "./cta-button";
import styles from "./site-header.module.css";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const { status } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isAuthenticated = status === "authenticated";
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 8);
  });

  return (
    <header className={styles.header} data-scrolled={isScrolled}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} onClick={() => setIsMenuOpen(false)}>
          <Logo variant="full" size={26} />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <CtaButton href="/dashboard" className={styles.ctaPrimary}>
              Go to dashboard
            </CtaButton>
          ) : (
            <>
              <Link href="/login" className={styles.ctaSecondary}>
                Log in
              </Link>
              <CtaButton href="/signup" className={styles.ctaPrimary}>
                Get started
              </CtaButton>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {isMenuOpen ? (
        <div className={styles.mobilePanel}>
          <nav className={styles.mobileNav} aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.ctaPrimary} onClick={() => setIsMenuOpen(false)}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.ctaSecondary} onClick={() => setIsMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/signup" className={styles.ctaPrimary} onClick={() => setIsMenuOpen(false)}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
