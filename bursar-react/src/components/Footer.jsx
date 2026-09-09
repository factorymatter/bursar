const footerLinks = {
  product: ['Features', 'Integrations', 'Pricing', 'Changelog', 'API Docs', 'Status'],
  company: ['About', 'Blog', 'Careers', 'Press', 'Partners', 'Contact'],
  compliance: ['FERPA Overview', 'Security', 'Data Processing', 'Accessibility (508)', 'Title IV Compliance', 'Support']
};

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="#" className="nav-logo" style={{ display: 'inline-flex' }}>
              <div className="nav-logo-icon">🎓</div>
              <div className="nav-logo-text">Bur<span>sar</span></div>
            </a>
            <p>Financial aid guardrail software for community colleges. Real-time enrollment risk detection that keeps students funded and enrolled.</p>
            <div className="footer-socials">
              <div className="social-icon">𝕏</div>
              <div className="social-icon">in</div>
              <div className="social-icon">▶</div>
              <div className="social-icon">📧</div>
            </div>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              {footerLinks.product.map((link, index) => (
                <li key={index}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              {footerLinks.company.map((link, index) => (
                <li key={index}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h4>Compliance</h4>
            <ul>
              {footerLinks.compliance.map((link, index) => (
                <li key={index}><a href="#">{link}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 Bursar Technologies, Inc. All rights reserved.</div>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">FERPA Policy</a>
            <a href="#">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
