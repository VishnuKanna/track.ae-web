import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Layers,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/store/AuthContext";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay },
});

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="landing">
        <div className="landing-grid" />
        <div className="landing-glow" />
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden />
      <div className="landing-glow" aria-hidden />
      <div className="orbit hero-orbit-1" aria-hidden>
        <div className="orbit-point" />
      </div>
      <div className="orbit hero-orbit-2" aria-hidden />

      <div className="float-fragments" aria-hidden>
        <div className="frag frag-f-1 anim-float">
          <span className="frag-status ok" />
          <span><strong>Interview</strong> · Google</span>
        </div>
        <div className="frag frag-f-2 anim-float" style={{ animationDelay: "-2s" }}>
          <Send size={13} className="series-orange" />
          <span><strong>Applied</strong> · 3 this week</span>
        </div>
        <div className="frag frag-f-3 anim-float" style={{ animationDelay: "-4s" }}>
          <CalendarClock size={13} className="series-orange" />
          <span><strong>Follow up</strong> · tomorrow</span>
        </div>
        <div className="frag frag-f-4 anim-float" style={{ animationDelay: "-1.5s" }}>
          <BellRing size={13} className="series-orange" />
          <span><strong>Offer</strong> · Emirates</span>
        </div>
      </div>

      <nav className="landing-nav" aria-label="Primary">
        <span className="brand">TRACK.AE<span className="brand-dot" /></span>
        <div className="landing-nav-actions">
          <Link to="/login?mode=login" className="btn btn-ghost-light">
            Login
          </Link>
          <Link to="/login?mode=signup" className="btn btn-light-solid">
            Sign up
          </Link>
        </div>
      </nav>

      <section className="hero">
        <motion.div className="hero-eyebrow" {...fadeUp(0.05)}>
          <span className="hero-orb anim-dot-pulse" />
          <span>Career command center</span>
        </motion.div>

        <motion.h1 className="hero-title" {...fadeUp(0.15)}>
          Track your <span className="hl">next move.</span>
        </motion.h1>

        <motion.p className="hero-sub" {...fadeUp(0.3)}>
          Your entire job search, organized in one intelligent command center.
          Every application, recruiter, follow-up, and interview — in one quiet place.
        </motion.p>

        <motion.div className="hero-ctas" {...fadeUp(0.45)}>
          <Link to="/login?mode=signup" className="btn btn-primary btn-lg">
            Continue with Google
            <span className="google-g" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#fff" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.7 29.1 35.5 24 35.5c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 5.7 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20c11.5 0 19-8.1 19-19.5 0-1.3-.1-2.6-.4-4z"/>
                <path fill="#ff6a00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 5.7 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#ff6a00" d="M24 44c5.2 0 9.9-1.9 13.4-5L31 34.9c-1.9 1.3-4.4 2.1-7 2.1-5.1 0-9.4-3.1-11.1-7.5l-6.4 5C10.2 39.4 16.6 44 24 44z"/>
                <path fill="#ff6a00" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.3 5.8l6.4 5C41.9 36.4 44 32.4 44 27.5c0-2.4-.2-4.6-.4-7z"/>
              </svg>
            </span>
          </Link>
          <a href="#features" className="btn btn-ghost-light">
            Explore Track.AE <ArrowRight size={16} />
          </a>
        </motion.div>

        <motion.span className="hero-hint" {...fadeUp(0.9)}>
          Scroll to explore
        </motion.span>
      </section>

      <section className="features" id="features">
        <div className="features-inner">
          <div className="feature">
            <h3><span className="fi"><Layers size={16} /></span> One pipeline</h3>
            <p>Every application, every company, every interview — in one quiet view.</p>
          </div>
          <div className="feature">
            <h3><span className="fi"><BellRing size={16} /></span> Follow-up intelligence</h3>
            <p>Know exactly who to ping and when. No more dropped threads.</p>
          </div>
          <div className="feature">
            <h3><span className="fi"><TrendingUp size={16} /></span> Honest analytics</h3>
            <p>Real conversion rates from your real search. No vanity numbers.</p>
          </div>
          <div className="feature">
            <h3><span className="fi"><Sparkles size={16} /></span> Built for mobile</h3>
            <p>Log opportunities from your phone in seconds, refine them later.</p>
          </div>
        </div>
      </section>

      <footer className="landing-foot">
        <div className="landing-foot-inner">
          <span>TRACK.AE — © {new Date().getFullYear()}</span>
          <span className="landing-foot-visit">Track your next move.</span>
        </div>
      </footer>
    </div>
  );
}