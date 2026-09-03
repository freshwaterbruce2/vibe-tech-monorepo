
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-aura-accent/10 mt-auto py-10 relative z-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-2xl font-bold mb-4 font-heading bg-gradient-to-r from-aura-accent to-aura-accentSecondary bg-clip-text text-transparent">
              Vibe Tech LLC
            </h3>
            <p className="text-white mb-4">
              Android apps on Google Play. Payments via Square.
            </p>
            <div className="text-white">
              <p>
                Bruce Freshwater ·{' '}
                <a className="hover:text-aura-accent underline-offset-4 hover:underline" href="mailto:Bfreshwater@vibe-tech.org">
                  Bfreshwater@vibe-tech.org
                </a>
              </p>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-lg text-white">Quick Links</h4>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
              <li>
                <Link to="/" className="text-white hover:text-aura-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white hover:text-aura-accent transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white hover:text-aura-accent transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-6 border-t border-aura-accent/10 flex flex-col md:flex-row items-center justify-between">
          <p className="text-white text-sm mb-4 md:mb-0">
            &copy; 2026 Vibe Tech LLC. All rights reserved.
          </p>
          
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-white hover:text-aura-accent transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white hover:text-aura-accent transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
