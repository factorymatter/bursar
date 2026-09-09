const faqs = [
  {
    question: 'Does Bursar modify student records or enrollment in our SIS?',
    answer: 'No. Bursar is a read-only observer of your SIS. It intercepts enrollment action events before they are submitted, surfaces a warning to the student, and routes them to an advisor. It never modifies, cancels, or delays an enrollment action on its own. The student and institution remain in full control of all records.'
  },
  {
    question: 'How does Bursar handle FERPA compliance?',
    answer: 'Bursar operates as a School Official under FERPA — meaning access to student data is limited to the legitimate educational interest of preventing financial aid loss. All data is processed within a FERPA-compliant environment, with encryption at rest and in transit, role-based access controls, and full audit logging. We sign a FERPA Data Processing Agreement with every institution before going live.'
  },
  {
    question: 'How long does integration take?',
    answer: 'For major SIS platforms (Ellucian Banner, Jenzabar, PeopleSoft), integration typically takes 3–5 business days. We provide a dedicated integration engineer, documentation, and a sandbox environment for testing. Your IT team\'s time commitment is usually under 4 hours — we do the heavy lifting.'
  },
  {
    question: 'What happens if our SIS is not on your supported list?',
    answer: 'Bursar provides a generic REST webhook bridge and JSON schema mapping toolkit for proprietary or regional student information systems. If your SIS exposes enrollment events via any API or webhook — even a legacy one — our team can build a custom connector. Contact us and we\'ll scope it during the pilot conversation.'
  },
  {
    question: 'Can we customize which rules fire and what the alerts say?',
    answer: 'Yes. The Professional plan includes configuration of all built-in rules. The District/System plan includes a full custom rule builder where your financial aid team can define institution-specific thresholds, add state grant rules, configure alert language, and set routing logic — all through a no-code interface. Changes take effect in real time with no downtime.'
  },
  {
    question: 'How is pricing calculated for mid-year enrollment fluctuations?',
    answer: 'Pricing is based on your official fall census headcount enrollment figure from the prior year. We don\'t meter per-alert or per-interaction. If your enrollment grows significantly (more than 20%) during the contract year, we\'ll do a true-up at renewal. No surprise mid-year invoices.'
  },
  {
    question: 'Is there a multi-college consortium discount?',
    answer: 'Yes. We actively partner with two-year college consortiums and state community college systems. Consortium pricing starts at a 20% discount for 5+ institutions and includes a shared analytics dashboard for system-level reporting. Contact our partnerships team to structure a consortium agreement.'
  }
];

export default function FAQ() {
  const toggleFaq = (btn) => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  };

  return (
    <section id="faq">
      <div className="section-inner">
        <div className="text-center fade-in">
          <div className="section-badge">❓ FAQ</div>
          <h2 className="section-title">Frequently Asked <span>Questions</span></h2>
          <p className="section-sub">Everything your IT team, financial aid director, and procurement office will ask.</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button className="faq-question" onClick={(e) => toggleFaq(e.currentTarget)}>
                {faq.question}
                <span className="faq-chevron">▾</span>
              </button>
              <div className="faq-answer">{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
