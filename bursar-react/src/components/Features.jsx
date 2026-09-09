const features = [
  {
    icon: '⚡',
    iconClass: 'white',
    title: 'Real-Time Rules Engine',
    desc: 'Bursar evaluates every enrollment action against a configurable rule library — credit thresholds, drop dates, census dates, SAP standing, and return-to-Title-IV calculations — in milliseconds. No batch jobs. No delayed recalculations.',
    tags: ['Pell Grant', 'SEOG', 'State Grants', 'Institutional Aid', 'Loans', 'SAP', 'R2T4'],
    isFeatured: true,
    mockRows: [
      { label: 'Rule: Credit threshold', val: '⚡ FIRING', className: 'warn' },
      { label: 'Rule: R2T4 calculation', val: '✓ Clear', className: 'success' },
      { label: 'Rule: SAP completion rate', val: '🚨 At Risk', className: 'danger' },
      { label: 'Rule: State grant threshold', val: '⚠ Evaluate', className: 'warn' },
      { label: 'Alert dispatched', val: '✓ 12ms', className: 'success' }
    ]
  },
  {
    icon: '🔔',
    iconClass: 'blue',
    title: 'Multi-Channel Notifications',
    desc: 'Alerts fire on the registration portal, via email, and SMS — at add/drop, schedule-change, and census-date checkpoints. Customizable per institution policy.'
  },
  {
    icon: '📅',
    iconClass: 'green',
    title: '1-Click Advisor Routing',
    desc: 'Every alert includes a smart routing layer that connects the at-risk student to the right advisor — financial aid, academic, or retention — with available appointment slots embedded.'
  },
  {
    icon: '📋',
    iconClass: 'amber',
    title: 'SAP Appeal Automation',
    desc: 'When a student falls below SAP thresholds, Bursar auto-populates the appeal form with their academic history, flags supporting documentation needs, and tracks submission status.'
  },
  {
    icon: '📈',
    iconClass: 'purple',
    title: 'Retention Analytics Dashboard',
    desc: 'Institution-wide dashboard showing intervention counts, at-risk student pipelines, advisor caseloads, and semester-over-semester dropout prevention metrics. Exportable for accreditation reporting.'
  },
  {
    icon: '🔐',
    iconClass: 'red',
    title: 'FERPA-Compliant by Design',
    desc: 'All student data stays within your institution\'s security boundary. Bursar operates as a data processor under FERPA, with role-based access controls and full audit logging for compliance reviews.'
  }
];

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">✨ Platform Features</div>
          <h2 className="section-title">Everything Your Aid Office <span>Needs</span></h2>
          <p className="section-sub">Built for community colleges, priced as compliance infrastructure, designed to prevent the enrollment mistakes that end student journeys.</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className={`feature-card ${feature.isFeatured ? 'featured' : ''} fade-in`} style={{ transitionDelay: index * 0.06 + 's' }}>
              {feature.isFeatured ? (
                <div className="feature-body">
                  <div>
                    <div className={`feature-icon ${feature.iconClass}`}>{feature.icon}</div>
                    <div className="feature-title">{feature.title}</div>
                    <div className="feature-desc" style={{ marginBottom: '20px' }}>{feature.desc}</div>
                    <div className="feature-tags">
                      {feature.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="feature-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="feature-mock">
                    {feature.mockRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="mock-row">
                        <span className="mock-label">{row.label}</span>
                        <span className={`mock-value ${row.className}`}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className={`feature-icon ${feature.iconClass}`}>{feature.icon}</div>
                  <div className="feature-title">{feature.title}</div>
                  <div className="feature-desc">{feature.desc}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
