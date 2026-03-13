import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <img src="img/logo.png" alt="RiDDiX - Matrix Synapse Panel" style={{maxWidth: 320, marginBottom: 24}} />
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: 'Multi-Server Management',
    description: 'Manage multiple Matrix Synapse homeservers from a single dashboard. Add, configure, monitor, and switch between servers with a built-in context selector.',
  },
  {
    title: 'Token-Based Registration',
    description: 'Create and manage invitation tokens via the Synapse Admin API. Control who can register on your homeserver with usage limits and expiration.',
  },
  {
    title: 'White-Label Branding',
    description: 'Fully customizable registration pages with theme colors, layout presets, custom content, logo uploads, and a live preview editor.',
  },
  {
    title: 'Integration Platform',
    description: 'Install and manage Matrix bridges (WhatsApp, Signal, Telegram) with auto-generated Docker Compose and appservice registration files.',
  },
  {
    title: 'Bot Platform',
    description: 'Create bots from templates — welcome, moderation, keyword responder, webhook relay, and more. Manage room assignments and feature toggles.',
  },
  {
    title: 'Security First',
    description: 'AES-256-GCM encryption for admin tokens and secrets, Zod input validation, rate limiting, audit logging, and security headers.',
  },
];

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section style={{padding: '4rem 0'}}>
          <div className="container">
            <div className="row">
              {features.map((f, i) => (
                <div key={i} className="col col--4" style={{marginBottom: '2rem'}}>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
