export default function CTASection() {
  return (
    <section className="cta-section">
      <div className="section-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-badge" style={{ justifyContent: 'center' }}>🎓 Ready to Get Started?</div>
        <h2>One Warning at the Right Moment<br />Changes Everything</h2>
        <p>
          Community college students deserve to understand the financial consequences of their enrollment decisions before those decisions become disasters. Bursar makes that possible — at scale, in real time, and at the cost of a coffee per student per year.
        </p>
        <div className="cta-btns">
          <a href="#pilot" className="btn btn-accent btn-xl">Request a Free Pilot →</a>
          <a href="#features" className="btn btn-ghost btn-xl" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Explore Features</a>
        </div>
      </div>
    </section>
  );
}
