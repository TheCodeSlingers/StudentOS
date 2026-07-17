import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SiteHeader } from "@/components/landing/site-header";
import { FaqSection } from "@/components/landing/faq-section";
import { Reveal } from "@/components/landing/reveal";
import { Marquee } from "@/components/landing/marquee";
import { StatsSection } from "@/components/landing/stats-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { HeroVisual } from "@/components/landing/hero-visual";
import { CtaButton } from "@/components/landing/cta-button";
import { FeatureCard } from "@/components/landing/feature-card";
import { StepCard } from "@/components/landing/step-card";
import styles from "./page.module.css";

const FEATURES = [
  {
    title: "Rotating attendance codes",
    description:
      "Open a time-boxed session and students check in with a fresh code — no proxy attendance, no manual roll call.",
    icon: CodeIcon,
  },
  {
    title: "Batches & sessions",
    description: "Organize students into batches, schedule sessions, and keep every roster in sync automatically.",
    icon: LayersIcon,
  },
  {
    title: "Manual overrides & history",
    description:
      "Mentors can override any attendance record with a reason, and every student gets a full session-by-session history.",
    icon: HistoryIcon,
  },
  {
    title: "Role-based dashboards",
    description: "Mentors and students each get a workspace scoped to exactly what they need — nothing more.",
    icon: ShieldIcon,
  },
  {
    title: "Member management",
    description: "Invite mentors and students by email and manage active, invited, and inactive members in one place.",
    icon: UsersIcon,
  },
  {
    title: "Workspace settings",
    description: "Tune timezone, default session duration, and late thresholds to match how your organization runs.",
    icon: SettingsIcon,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your workspace",
    description: "Sign up and set your timezone and attendance defaults in seconds — no setup call required.",
  },
  {
    number: "02",
    title: "Invite your team",
    description: "Add mentors and students by email, then organize students into batches.",
  },
  {
    number: "03",
    title: "Run sessions, track attendance",
    description: "Open a session, share the rotating code, and watch attendance come in live.",
  },
];

function CodeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7 5.5L2.5 10 7 14.5M13 5.5L17.5 10 13 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l7 3.5L10 10 3 6.5 10 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 10.5L10 14l7-3.5M3 14.5L10 18l7-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4l2.6 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5l6 2.2v4.4c0 4-2.6 6.9-6 8.4-3.4-1.5-6-4.4-6-8.4V4.7l6-2.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.2 10.1l1.9 1.9 3.7-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.8 16.3c.4-2.6 2.2-4.2 4.7-4.2s4.3 1.6 4.7 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 4.4c1.3.4 2.2 1.5 2.2 3s-.9 2.6-2.2 3M15 12c1.6.6 2.6 1.9 2.9 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 2.8v1.8M10 15.4v1.8M17.2 10h-1.8M4.6 10H2.8M15 5l-1.3 1.3M6.3 13.7L5 15M15 15l-1.3-1.3M6.3 6.3L5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Reveal className={styles.heroCopy}>
              <span className={styles.eyebrow}>Attendance &amp; operations, in one workspace</span>
              <h1>Run attendance, batches, and student records from one place.</h1>
              <p>
                StudentOS gives coaching centers and student organizations a single, secure workspace for daily
                operations — from rostering batches to running fraud-resistant attendance sessions.
              </p>
              <div className={styles.heroActions}>
                <CtaButton href="/signup" className={styles.heroPrimary}>
                  Get started free
                </CtaButton>
                <CtaButton href="/login" className={styles.heroSecondary}>
                  Log in
                </CtaButton>
              </div>
              <p className={styles.heroFootnote}>No credit card required · Set up a workspace in minutes</p>
            </Reveal>

            <div className={styles.heroVisual}>
              <HeroVisual />
            </div>
          </div>
        </section>

        <Marquee />

        <section id="features" className={styles.features}>
          <Reveal className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Everything your team needs</span>
            <h2>Built for the way coaching centers actually run</h2>
            <p>One workspace for mentors and students, with the right access for each role.</p>
          </Reveal>

          <div className={styles.featureGrid}>
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <FeatureCard
                  key={feature.title}
                  icon={<Icon />}
                  title={feature.title}
                  description={feature.description}
                  delay={(index % 3) * 0.08}
                />
              );
            })}
          </div>
        </section>

        <StatsSection />

        <section id="how-it-works" className={styles.steps}>
          <Reveal className={styles.sectionHeading}>
            <span className={styles.eyebrow}>How it works</span>
            <h2>From sign-up to your first session in minutes</h2>
          </Reveal>

          <div className={styles.stepGrid}>
            {STEPS.map((step, index) => (
              <StepCard
                key={step.number}
                number={step.number}
                title={step.title}
                description={step.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>

        <AudienceSection />

        <section className={styles.highlight}>
          <Reveal className={styles.highlightCopy}>
            <span className={styles.eyebrow}>Fraud-resistant by design</span>
            <h2>A fresh code for every session, visible only while attendance is open.</h2>
            <p>
              Mentors open an attendance window for a set duration and share the live code. Students self check-in
              with it, and once the window closes, the code expires — no reuse, no guesswork.
            </p>
            <ul className={styles.highlightList}>
              <li>
                <CheckIcon />
                <span>Time-boxed attendance windows with a live countdown</span>
              </li>
              <li>
                <CheckIcon />
                <span>Manual marking with a required reason for every override</span>
              </li>
              <li>
                <CheckIcon />
                <span>Full attendance history per student, per batch</span>
              </li>
            </ul>
          </Reveal>

          <Reveal className={styles.highlightVisual} delay={0.15}>
            <div className={styles.codeCardLarge} aria-hidden="true">
              <p className={styles.mockLabel}>Attendance code</p>
              <div className={styles.mockCodeLarge}>7 3 0 6 1 4</div>
              <p className={styles.mockTimer}>
                <span className={styles.liveDot} />
                Time left: 04:12
              </p>
            </div>
          </Reveal>
        </section>

        <FaqSection />

        <section className={styles.ctaBanner}>
          <Reveal className={styles.ctaInner}>
            <Logo variant="mark" size={40} inverse />
            <h2>Ready to simplify attendance for your organization?</h2>
            <p>Create a workspace, invite your team, and run your first session today.</p>
            <CtaButton href="/signup" className={styles.ctaBannerButton}>
              Get started free
            </CtaButton>
          </Reveal>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo variant="full" />
            <p>Attendance, batches, and organization management for coaching centers and student communities.</p>
          </div>

          <div className={styles.footerColumn}>
            <span className={styles.footerHeading}>Product</span>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className={styles.footerColumn}>
            <span className={styles.footerHeading}>Account</span>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} StudentOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
