const pricingTiers = [
  {
    tier: 'Starter',
    name: 'Essentials',
    desc: 'For smaller community colleges piloting real-time aid guardrails for the first time.',
    price: '$3',
    cycle: 'per year · billed annually · up to 3,000 students',
    features: [
      'Real-time credit-hour threshold alerts',
      'Pell Grant & SEOG impact calculation',
      '1-click advisor routing',
      'Email & portal notifications',
      'Ellucian Banner integration',
      'Standard reporting dashboard',
      'SAP appeal automation',
      'Multi-SIS support',
      'Custom rule builder'
    ],
    buttonClass: 'btn-ghost',
    buttonText: 'Start Free Pilot'
  },
  {
    tier: 'Growth',
    name: 'Professional',
    desc: 'For established institutions ready to deploy institution-wide, including SAP automation.',
    price: '$4',
    cycle: 'per year · billed annually · up to 10,000 students',
    features: [
      'Everything in Essentials',
      'SAP appeal automation',
      'Return-to-Title-IV (R2T4) calculation',
      'State grant & institutional aid rules',
      'SMS notifications',
      'Multi-SIS integration (Banner + Jenzabar)',
      'Retention analytics dashboard',
      'Advisor caseload management',
      'Custom rule builder'
    ],
    buttonClass: 'btn-primary',
    buttonText: 'Start Free Pilot',
    popular: true,
    note: 'Most institutions see ROI within 60 days'
  },
  {
    tier: 'Enterprise',
    name: 'District / System',
    desc: 'For multi-college districts and state systems requiring custom rules, dedicated support, and SSO.',
    price: '$5',
    cycle: 'per year · billed annually · unlimited students',
    features: [
      'Everything in Professional',
      'Custom rule builder & policy configuration',
      'District-wide analytics & benchmarking',
      'SSO / SAML integration',
      'Dedicated Customer Success Manager',
      'SLA-backed uptime guarantee (99.9%)',
      'Consortium pricing available',
      'Priority SIS integration support',
      'FERPA DPA & custom BAA'
    ],
    buttonClass: 'btn-ghost',
    buttonText: 'Contact Sales'
  }
];

const comparisonRows = [
  { feature: 'Real-time credit-hour alerts', essentials: true, professional: true, enterprise: true },
  { feature: 'Pell Grant impact calculation', essentials: true, professional: true, enterprise: true },
  { feature: 'SAP appeal automation', essentials: false, professional: true, enterprise: true },
  { feature: 'R2T4 calculation', essentials: false, professional: true, enterprise: true },
  { feature: 'Custom rule builder', essentials: false, professional: false, enterprise: true },
  { feature: 'Multi-SIS integration', essentials: false, professional: true, enterprise: true },
  { feature: 'District-wide benchmarking', essentials: false, professional: false, enterprise: true },
  { feature: 'Dedicated CSM', essentials: false, professional: false, enterprise: true }
];

export default function Pricing() {
  return (
    <section className="pricing" id="pricing">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">💰 Pricing</div>
          <h2 className="section-title">Compliance Infrastructure <span>Pricing</span></h2>
          <p className="section-sub">Priced per enrolled learner per year — fits inside your compliance budget alongside Title IV audit and accreditation tooling.</p>
        </div>
        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <div key={index} className={`pricing-card fade-in ${tier.popular ? 'popular' : ''}`} style={{ transitionDelay: (index * 0.1) + 's' }}>
              {tier.popular && <div className="popular-badge">Most Popular</div>}
              <div className="pricing-tier">{tier.tier}</div>
              <div className="pricing-name">{tier.name}</div>
              <div className="pricing-desc">{tier.desc}</div>
              <div className="pricing-price">{tier.price} <span>/ learner</span></div>
              <div className="pricing-cycle">{tier.cycle}</div>
              <div className="pricing-divider"></div>
              <ul className="pricing-features">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className={tier.features[featureIndex] === feature ? '' : 'muted'}>
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#pilot" className={`btn ${tier.buttonClass}`} style={{ width: '100%', justifyContent: 'center' }}>{tier.buttonText}</a>
              {tier.note && <div className="pricing-note">{tier.note}</div>}
            </div>
          ))}
        </div>
        <div className="pricing-compare fade-in">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Essentials</th>
                <th>Professional</th>
                <th>District / System</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, index) => (
                <tr key={index}>
                  <td>{row.feature}</td>
                  <td><span className={row.essentials ? 'check' : 'dash'}>{row.essentials ? '✓' : '—'}</span></td>
                  <td><span className={row.professional ? 'check' : 'dash'}>{row.professional ? '✓' : '—'}</span></td>
                  <td><span className={row.enterprise ? 'check' : 'dash'}>{row.enterprise ? '✓' : '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
