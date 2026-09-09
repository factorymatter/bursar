const metrics = [
  { num: '83%', label: 'of at-risk students who saw a Bursar alert kept their aid intact' },
  { num: '$1,240', label: 'average aid loss prevented per intervention' },
  { num: '67%', label: 'reduction in emergency financial aid appeals per semester' },
  { num: '12ms', label: 'median alert latency from enrollment event to student screen' }
];

export default function Metrics() {
  return (
    <section id="metrics">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">📊 Impact</div>
          <h2 className="section-title">The Numbers That <span>Matter</span></h2>
          <p className="section-sub">Early pilot data from partner institutions shows measurable outcomes within the first semester of deployment.</p>
        </div>
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <div key={index} className={`metric-card fade-in`} style={{ transitionDelay: (index * 0.08) + 's' }}>
              <div className="metric-num">{metric.num}</div>
              <div className="metric-label">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
