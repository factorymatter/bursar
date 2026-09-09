export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow"></div>
      <div className="hero-glow-2"></div>
      <div className="hero-inner">
        <div>
          <div className="hero-badge">
            <div className="hero-badge-dot"></div>
            Real-Time Financial Aid Intelligence
          </div>
          <h1>Stop Aid Loss <span>Before It Starts</span></h1>
          <p className="hero-desc">
            Bursar monitors enrollment changes in real time and warns community college students — at the exact moment they click — when a schedule change will cost them their grant.
          </p>
          <div className="hero-ctas">
            <a href="#pilot" className="btn btn-accent btn-xl">Request a Free Pilot →</a>
            <a href="#how-it-works" className="btn btn-ghost btn-xl" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>See How It Works</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">$3–$5</div>
              <div className="hero-stat-label">per learner / year</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">+662%</div>
              <div className="hero-stat-label">keyword growth YoY</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">1 in 3</div>
              <div className="hero-stat-label">CC students drop due to aid issues</div>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-chip chip-1">
            <div className="chip-dot green"></div> 3 students protected today
          </div>
          <div className="floating-chip chip-2">
            <div className="chip-dot amber"></div>⚠️ Drop risk detected
          </div>
          <div className="hero-card">
            <div className="hero-card-header">
              <div className="hero-card-icon">⚠️</div>
              <div>
                <div className="hero-card-title">Financial Aid Impact Warning</div>
                <div className="hero-card-sub">Triggered: Course Withdrawal Request — ENGL 102</div>
              </div>
            </div>
            <div className="alert-box">
              <div className="alert-box-title">🚨 Grant Eligibility Change Detected</div>
              <div className="alert-box-body">
                Dropping ENGL 102 reduces your credit load to 8 credits. This falls below the 12-credit full-time threshold required for your Pell Grant award.
              </div>
            </div>
            <div className="impact-row">
              <div className="impact-item">
                <div className="impact-item-label">Current Aid</div>
                <div className="impact-item-val">$3,200</div>
              </div>
              <div className="impact-item danger">
                <div className="impact-item-label">After Drop</div>
                <div className="impact-item-val">$1,800</div>
              </div>
              <div className="impact-item danger">
                <div className="impact-item-label">You'd Owe</div>
                <div className="impact-item-val">−$1,400</div>
              </div>
            </div>
            <div className="advisor-row">
              <div className="advisor-avatar">👩‍💼</div>
              <div>
                <div className="advisor-text">Routed to Financial Aid Advisor — Ms. Reyes</div>
                <div className="advisor-sub">Next opening: Today at 2:00 PM · Book in 1 click</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
