const steps = [
  {
    number: '01',
    title: 'Connect Your SIS',
    description: 'Bursar integrates with Ellucian Banner, Jenzabar, PeopleSoft, and Anthology via secure REST APIs. Enrollment data and aid package details sync in real time. Setup takes less than a week.'
  },
  {
    number: '02',
    title: 'Rules Engine Evaluates',
    description: 'When a student initiates any enrollment action, Bursar\'s rules engine maps the change against credit-hour thresholds, drop dates, SAP standings, and institution-specific policies within milliseconds.'
  },
  {
    number: '03',
    title: 'Real-Time Warning Fires',
    description: 'A plain-language alert appears on the student\'s registration screen — before they confirm. It shows exactly how their aid package changes and routes them to the right advisor with one click.'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">⚙️ How It Works</div>
          <h2 className="section-title">Intervention at the <span>Decision Point</span></h2>
          <p className="section-sub">Bursar plugs into your SIS and fires at the exact moment a student initiates a change — before they click Submit.</p>
        </div>
        <div className="hiw-steps">
          {steps.map((step, index) => (
            <div key={index} className={`hiw-step fade-in`} style={{ transitionDelay: index * 0.1 + 's' }}>
              <div className="hiw-step-num">{step.number}</div>
              {index < steps.length - 1 && <div className="hiw-step-connector"></div>}
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
