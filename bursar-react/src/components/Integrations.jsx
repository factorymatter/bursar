const integrations = [
  {
    icon: '🏛️',
    name: 'Ellucian Banner',
    desc: 'Full REST API integration with Banner 9. Live enrollment sync, aid package reads, and hold management.',
    status: 'Live'
  },
  {
    icon: '📚',
    name: 'Jenzabar EX / J1',
    desc: 'Certified connector for Jenzabar EX and J1. Supports all enrollment action types and financial records.',
    status: 'Live'
  },
  {
    icon: '☁️',
    name: 'PeopleSoft Campus',
    desc: 'Oracle PeopleSoft Campus Solutions integration via PeopleTools API. Real-time enrollment event hooks.',
    status: 'Live'
  },
  {
    icon: '🔷',
    name: 'Workday Student',
    desc: 'Workday Student REST API connector. Enrollment, academic record, and financial aid reads.',
    status: 'Q3 2026'
  },
  {
    icon: '🎓',
    name: 'Anthology (Colleague)',
    desc: 'Ellucian Colleague via the Colleague Web API. Covers enrollment, financial aid, and student AR modules.',
    status: 'Live'
  },
  {
    icon: '💡',
    name: 'Civitas Learning',
    desc: 'Bidirectional sync with Civitas to enrich risk scores with enrollment-change signals from Bursar.',
    status: 'Q4 2026'
  },
  {
    icon: '📧',
    name: 'Microsoft 365 / Teams',
    desc: 'Advisor notifications via Teams channels. Outlook calendar integration for 1-click appointment booking.',
    status: 'Live'
  },
  {
    icon: '⚙️',
    name: 'Custom SIS via API',
    desc: 'Proprietary or regional SIS? Bursar provides a generic REST webhook bridge with JSON schema mapping.',
    status: 'Custom'
  }
];

const sampleWebhookPayload = `{
  "event": "enrollment.risk_detected",
  "timestamp": "2026-06-25T14:32:08Z",
  "student_id": "STU-0029314",
  "action": "course_withdrawal",
  "course": "ENGL-102-001",
  "risk_level": "HIGH",
  "impact": {
    "credits_before": 15,
    "credits_after": 9,
    "pell_before": 3200,
    "pell_after": 1800,
    "balance_due": 1400,
    "r2t4_triggered": false
  },
  "advisor_routed": true,
  "alert_shown": true
}`;

export default function Integrations() {
  return (
    <section className="integrations" id="integrations">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">🔗 Integrations</div>
          <h2 className="section-title">Plugs Into Every Major <span style={{ color: '#60a5fa' }}>Student System</span></h2>
          <p className="section-sub">No rip-and-replace. Bursar sits on top of your existing SIS and pulls live enrollment + aid data via secure APIs.</p>
        </div>
        <div className="int-grid">
          {integrations.map((int, index) => (
            <div key={index} className={`int-card fade-in`} style={{ transitionDelay: (index * 0.06) + 's' }}>
              <div className="int-icon">{int.icon}</div>
              <div className="int-name">{int.name}</div>
              <div className="int-desc">{int.desc}</div>
              <span className={`int-badge ${int.status === 'Q3 2026' || int.status === 'Q4 2026' ? 'soon' : ''}`}>{int.status}</span>
            </div>
          ))}
        </div>
        <div className="api-block fade-in">
          <div className="api-block-title">📡 Sample Webhook Payload — Enrollment Change Event</div>
          <div className="code-block">
            <span className="code-cm">// Bursar fires this event when a high-risk enrollment action is intercepted</span>
            <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>{sampleWebhookPayload}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
