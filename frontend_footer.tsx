import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-24 bg-forest text-cream" data-testid="site-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <Logo inverse />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#A7C4B2]">
            Rescue surplus. Redistribute smarter. ResQMeal is an early-stage MVP being prepared for
            responsible pilot testing.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A7C4B2]">Platform</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a className="hover:text-orange" href="/#how-it-works">How it works</a></li>
            <li><a className="hover:text-orange" href="/#rescueiq">RescueIQ matching</a></li>
            <li><a className="hover:text-orange" href="/#rewardloop">RewardLoop (proposed)</a></li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A7C4B2]">Legal</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link data-testid="footer-privacy-link" className="hover:text-orange" to="/privacy">Privacy Policy</Link></li>
            <li><Link data-testid="footer-terms-link" className="hover:text-orange" to="/terms">Terms of Use</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-[#A7C4B2] sm:px-6 lg:px-8">
          © {new Date().getFullYear()} ResQMeal. Food safety remains the responsibility of each donor and recipient.
        </p>
      </div>
    </footer>
  );
}
