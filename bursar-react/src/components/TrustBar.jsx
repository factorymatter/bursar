const integrations = [
  'Ellucian Banner',
  'Jenzabar EX',
  'PeopleSoft Campus',
  'Workday Student',
  'Anthology',
  'Civitas Learning'
];

export default function TrustBar() {
  return (
    <div className="trust-bar">
      <div className="trust-inner">
        <div className="trust-label">INTEGRATED WITH</div>
        <div className="trust-logos">
          {integrations.map((logo, index) => (
            <div key={index} className="trust-logo">{logo}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
