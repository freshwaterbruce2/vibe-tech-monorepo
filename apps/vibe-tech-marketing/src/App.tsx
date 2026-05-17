import { createDefaultLandingContent } from '@vibetech/landing';
import type { CSSProperties } from 'react';

type ProductStatus = 'Available Now' | 'Launching Next Month' | 'Available on Demand';

interface Product {
  name: string;
  category: string;
  status: ProductStatus;
  features: readonly string[];
}

const products: readonly Product[] = [
  {
    name: 'Clinic Autopilot',
    category: 'Appointment Reminder System',
    status: 'Available Now',
    features: [
      'Automated SMS/email sweeps',
      'Magic single-use reschedule links',
      'Live no-show analytics',
    ],
  },
  {
    name: 'Waitlist Manager',
    category: 'Open-slot booking automation',
    status: 'Launching Next Month',
    features: [
      'Auto-notify patients when slots open',
      'Priority ranking',
      'One-click booking',
    ],
  },
  {
    name: 'Referral Tracker',
    category: 'Referral workflow operations',
    status: 'Available on Demand',
    features: [
      'Log incoming/outgoing referrals',
      'Track patient status',
      'Alert on overdue follow-ups',
    ],
  },
];

const content = createDefaultLandingContent({
  productName: 'Vibe-Tech',
  badge: 'Micro-SaaS Factory for healthcare clinics',
  title: 'Custom Clinic Software at the Speed of AI.',
  subtitle:
    'We build, deploy, and manage custom patient portals and internal tools for local clinics. Fixed pricing. Zero IT headaches.',
  primaryAction: { label: 'Explore Our Solutions', href: '#solutions' },
  secondaryAction: { label: 'See Pricing', href: '#pricing' },
  footerRight: 'Micro-SaaS products for clinics, built and managed by Vibe-Tech',
});

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(34, 211, 238, 0.18), transparent 28rem), #08111f',
    color: '#f5f7fb',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  container: {
    maxWidth: '1120px',
    margin: '0 auto',
    padding: '0 24px',
  },
  hero: {
    padding: '82px 0 70px',
    display: 'grid',
    gap: '28px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-block',
    marginBottom: '18px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(14, 165, 233, 0.16)',
    color: '#67e8f9',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  heroTitle: {
    margin: '0 0 18px',
    fontSize: 'clamp(42px, 8vw, 68px)',
    lineHeight: 0.98,
    maxWidth: '760px',
  },
  heroBody: {
    margin: '0 0 28px',
    fontSize: '18px',
    lineHeight: 1.65,
    color: '#b7c3d6',
    maxWidth: '640px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 18px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '14px',
  },
  primaryButton: {
    background: '#22d3ee',
    color: '#062133',
  },
  secondaryButton: {
    border: '1px solid rgba(148, 163, 184, 0.32)',
    color: '#e2e8f0',
    background: 'rgba(15, 23, 42, 0.5)',
  },
  heroPanel: {
    border: '1px solid rgba(148, 163, 184, 0.22)',
    borderRadius: '8px',
    background: 'rgba(15, 23, 42, 0.72)',
    padding: '22px',
  },
  heroPanelTitle: {
    margin: '0 0 12px',
    fontSize: '20px',
  },
  heroPanelText: {
    margin: 0,
    color: '#b7c3d6',
    lineHeight: 1.6,
  },
  section: {
    padding: '28px 0 66px',
  },
  sectionHeader: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '36px',
    lineHeight: 1.1,
  },
  sectionBody: {
    margin: 0,
    color: '#b7c3d6',
    fontSize: '16px',
    lineHeight: 1.6,
    maxWidth: '760px',
  },
  grid: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  },
  card: {
    border: '1px solid rgba(148, 163, 184, 0.22)',
    borderRadius: '8px',
    background: 'rgba(15, 23, 42, 0.72)',
    padding: '22px',
  },
  productCardLive: {
    borderColor: 'rgba(34, 211, 238, 0.5)',
    boxShadow: '0 0 0 1px rgba(34, 211, 238, 0.16)',
  },
  status: {
    display: 'inline-block',
    marginBottom: '14px',
    padding: '5px 10px',
    borderRadius: '999px',
    background: 'rgba(34, 211, 238, 0.14)',
    color: '#67e8f9',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  mutedStatus: {
    background: 'rgba(148, 163, 184, 0.14)',
    color: '#cbd5e1',
  },
  cardTitle: {
    margin: '0 0 6px',
    fontSize: '22px',
  },
  category: {
    margin: '0 0 18px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    color: '#dbe4f2',
    lineHeight: 1.7,
  },
  pricingCard: {
    border: '1px solid rgba(34, 211, 238, 0.42)',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(8, 17, 31, 0.9))',
    padding: '28px',
  },
  price: {
    margin: '4px 0 8px',
    fontSize: '40px',
    fontWeight: 800,
  },
  footer: {
    borderTop: '1px solid rgba(148, 163, 184, 0.16)',
    padding: '24px 0 48px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  footerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
};

export function App() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.badge}>{content.badge}</div>
            <h1 style={styles.heroTitle}>{content.title}</h1>
            <p style={styles.heroBody}>{content.subtitle}</p>
            <div style={styles.row}>
              <ActionLink href={content.primaryAction.href} primary>
                {content.primaryAction.label}
              </ActionLink>
              {content.secondaryAction ? (
                <ActionLink href={content.secondaryAction.href}>
                  {content.secondaryAction.label}
                </ActionLink>
              ) : null}
            </div>
          </div>
          <aside style={styles.heroPanel} aria-label="Clinic software factory model">
            <h2 style={styles.heroPanelTitle}>One reusable operating model.</h2>
            <p style={styles.heroPanelText}>
              Every product shares the same delivery foundation: clinic branding, hosted
              infrastructure, maintenance coverage, and fast AI-assisted build cycles.
            </p>
          </aside>
        </section>

        <section id="solutions" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Clinic tools ready to launch and expand.</h2>
            <p style={styles.sectionBody}>
              Start with Clinic Autopilot today, then add more workflow apps from the same
              product catalog as your clinic grows.
            </p>
          </div>
          <ProductGrid products={products} />
        </section>

        <section id="pricing" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Simple modular pricing.</h2>
            <p style={styles.sectionBody}>
              Fixed setup plus one predictable monthly fee per application. No surprise IT
              projects, infrastructure bills, or maintenance retainers.
            </p>
          </div>
          <article style={styles.pricingCard}>
            <h3 style={styles.cardTitle}>Productized Clinic Software</h3>
            <div style={styles.price}>$497 setup + $49/month per application</div>
            <p style={styles.sectionBody}>
              Includes custom white-label branding, dedicated hosting, and 24/7 maintenance.
            </p>
          </article>
        </section>

        <section style={{ ...styles.section, paddingTop: 0 }}>
          <article style={styles.card}>
            <div style={styles.row}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <h2 style={styles.sectionTitle}>Build the next clinic workflow without a redesign.</h2>
                <p style={styles.sectionBody}>
                  The catalog is data-driven, so the next patient portal or internal tool can be
                  added by registering one more product object.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ActionLink href="#solutions" primary>
                  Explore Our Solutions
                </ActionLink>
              </div>
            </div>
          </article>
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <span>{content.footerLeft}</span>
            <span>{content.footerRight}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProductGrid({ products: productItems }: { products: readonly Product[] }) {
  return (
    <div style={styles.grid}>
      {productItems.map((product) => (
        <ProductCard key={product.name} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const isLive = product.status === 'Available Now';

  return (
    <article style={{ ...styles.card, ...(isLive ? styles.productCardLive : {}) }}>
      <div style={{ ...styles.status, ...(isLive ? {} : styles.mutedStatus) }}>
        {product.status}
      </div>
      <h3 style={styles.cardTitle}>{product.name}</h3>
      <p style={styles.category}>{product.category}</p>
      <ul style={styles.list}>
        {product.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </article>
  );
}

function ActionLink({
  children,
  href,
  primary = false,
}: {
  children: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        ...styles.button,
        ...(primary ? styles.primaryButton : styles.secondaryButton),
      }}
    >
      {children}
    </a>
  );
}
