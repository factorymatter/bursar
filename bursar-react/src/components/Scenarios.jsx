const scenarios = [
  {
    emoji: '📉',
    title: 'Course Withdrawal',
    trigger: 'Trigger: Student drops any enrolled course',
    rows: [
      { key: 'Credits before', val: '15 (full-time)', className: '' },
      { key: 'Credits after drop', val: '9 (half-time)', className: 'red' },
      { key: 'Pell impact', val: '−$1,400 / semester', className: 'red' },
      { key: 'Return-to-IV risk', val: 'Evaluate', className: 'amber' }
    ],
    action: '🔔 Alert fired → Advisor routed → Appointment booked'
  },
  {
    emoji: '🏖️',
    title: 'Part-Time Switch',
    trigger: 'Trigger: Credits drop below 12 threshold',
    rows: [
      { key: 'Pell recalculation', val: 'Yes — immediate', className: 'red' },
      { key: 'State grant eligibility', val: 'At risk', className: 'red' },
      { key: 'Institutional scholarship', val: 'Forfeit likely', className: 'red' },
      { key: 'SAP completion rate', val: 'Watch zone', className: 'amber' }
    ],
    action: '📋 Checklist generated → Advisor meeting scheduled'
  },
  {
    emoji: '☀️',
    title: 'Summer Course Add',
    trigger: 'Trigger: Enrollment in non-standard term',
    rows: [
      { key: 'Annual Pell cap', val: 'Near limit', className: 'amber' },
      { key: 'Year-round Pell eligible', val: 'Confirmed ✓', className: 'green' },
      { key: 'Loan limit check', val: 'OK ✓', className: 'green' },
      { key: 'Maximum credit hours', val: 'Within range ✓', className: 'green' }
    ],
    action: '✅ Clear to proceed — aid details shown'
  },
  {
    emoji: '📊',
    title: 'SAP Warning Threshold',
    trigger: 'Trigger: GPA or completion rate nearing limit',
    rows: [
      { key: 'Cumulative GPA', val: '2.05 (min 2.0)', className: 'amber' },
      { key: 'Completion rate', val: '64% (min 67%)', className: 'red' },
      { key: 'Aid eligibility', val: 'SAP Warning', className: 'amber' },
      { key: 'Appeal window', val: 'Open ✓', className: 'green' }
    ],
    action: '📝 SAP appeal form auto-populated → Submitted'
  }
];

export default function Scenarios() {
  return (
    <section style={{ background: 'var(--bg)', paddingTop: 0, paddingBottom: '100px' }}>
      <div className="section-inner">
        <div className="text-center fade-in" style={{ marginBottom: 0 }}>
          <div className="section-badge">🎯 Risk Scenarios</div>
          <h2 className="section-title">Every High-Risk Scenario, <span>Covered</span></h2>
          <p className="section-sub">Bursar's rules engine handles the most common — and costly — enrollment-to-aid impact scenarios out of the box.</p>
        </div>
        <div className="scenarios-grid">
          {scenarios.map((scenario, index) => (
            <div key={index} className={`scenario-card fade-in`} style={{ transitionDelay: (index * 0.08) + 's' }}>
              <div className="scenario-header">
                <div className="scenario-emoji">{scenario.emoji}</div>
                <div>
                  <div className="scenario-title">{scenario.title}</div>
                  <div className="scenario-trigger">{scenario.trigger}</div>
                </div>
              </div>
              <div className="scenario-body">
                {scenario.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="scenario-row">
                    <span className="scenario-key">{row.key}</span>
                    <span className={`scenario-val ${row.className}`}>{row.val}</span>
                  </div>
                ))}
                <div className="scenario-action">{scenario.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
