const marketStats = [
  {
    label: 'US Community Colleges',
    num: '1,050+',
    change: '↑ Growing enrollment post-2024'
  },
  {
    label: 'Students at Financial Risk',
    num: '~4.8M',
    change: '↑ 662% keyword growth YoY'
  },
  {
    label: 'ARR Potential',
    num: '$100K–$1M',
    change: '↑ $3–$5 per learner / year'
  }
];

const barChartData = [
  { year: '2023', width: 40, value: '1.5K' },
  { year: '2024', width: 65, value: '3.8K' },
  { year: '2025', width: 85, value: '6.9K' },
  { year: '2026', width: 100, value: '9.9K' }
];

const topKeywords = [
  { text: 'FAFSA student loans', volume: '33.1K/mo' },
  { text: 'Apply for student finance', volume: '12.1K/mo' },
  { text: 'Federal student aid estimator', volume: '9.9K/mo' },
  { text: 'Student loans', volume: '1M+/mo' }
];

export default function Market() {
  return (
    <section className="market">
      <div className="section-inner">
        <div className="market-grid">
          <div className="fade-in">
            <div className="section-badge">📈 Market Opportunity</div>
            <h2 className="section-title">A $100M+ <span>Compliance Market</span></h2>
            <p className="section-sub" style={{ marginBottom: '32px' }}>
              With 1,000+ community colleges in the US serving 12 million students, and dropout driven by avoidable aid errors, Bursar is positioned as essential compliance infrastructure — not discretionary software.
            </p>
            <div className="market-stats">
              {marketStats.map((stat, index) => (
                <div key={index} className="market-stat">
                  <div className="market-stat-label">{stat.label}</div>
                  <div className="market-stat-num">{stat.num}</div>
                  <div className="market-stat-change">{stat.change}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="market-chart fade-in" style={{ transitionDelay: '.15s' }}>
            <div className="market-chart-title">📊 Federal Student Aid Estimator — Search Volume Growth</div>
            <div className="bar-chart">
              {barChartData.map((bar, index) => (
                <div key={index} className="bar-row">
                  <div className="bar-label">{bar.year}</div>
                  <div className="bar-track">
                    <div className={`bar-fill b${index + 1}`} style={{ width: `${bar.width}%` }}>{bar.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: `1px solid var(--border)` }}>
              <div style={{ fontSize: '.8rem', color: 'var(--gray)', marginBottom: '12px', fontWeight: 600 }}>TOP KEYWORDS — LOW COMPETITION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topKeywords.map((kw, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                    <span>{kw.text}</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{kw.volume}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
