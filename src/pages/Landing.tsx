import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Layers,
  Send,
} from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { cn } from "@/lib/cn";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease, delay },
});

export function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [featuresOpen, setFeaturesOpen] = useState(false);

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
          <button
            type="button"
            className={cn("features-toggle btn btn-ghost-light", featuresOpen && "is-open")}
            onClick={() => setFeaturesOpen((o) => !o)}
            aria-expanded={featuresOpen}
            aria-controls="landing-features"
          >
            Features
            <ChevronDown size={15} />
          </button>
          <Link to="/login" className="btn btn-ghost-light">
            Login
          </Link>
          <Link to="/signup" className="btn btn-light-solid">
            Sign up
          </Link>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {featuresOpen && (
          <motion.section
            className="features-panel"
            id="landing-features"
            role="region"
            aria-label="Track.AE features"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="features-panel-inner">
              <div className="fp-item">
                <span className="fp-head">
                  <span className="fp-icon"><Layers size={15} /></span>
                  <span className="fp-title">Track</span>
                </span>
                <p className="fp-desc">Keep every job application organized in one place.</p>
              </div>
              <div className="fp-item">
                <span className="fp-head">
                  <span className="fp-icon"><ClipboardList size={15} /></span>
                  <span className="fp-title">Log</span>
                </span>
                <p className="fp-desc">Capture interviews, follow-ups, HR contacts and important updates.</p>
              </div>
              <div className="fp-item">
                <span className="fp-head">
                  <span className="fp-icon"><CalendarClock size={15} /></span>
                  <span className="fp-title">Check your jobs</span>
                </span>
                <p className="fp-desc">See what needs your attention and stay on top of every opportunity.</p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="hero">
        <motion.div className="hero-eyebrow" {...fadeUp(0.05)}>
          <span className="hero-orb anim-dot-pulse" />
          <span>Track your next move</span>
        </motion.div>

        <motion.h1 className="hero-title" {...fadeUp(0.15)}>
          Job tracking made <span className="hl">easy.</span>
        </motion.h1>

        <motion.p className="hero-sub" {...fadeUp(0.3)}>
          Your entire job search, organized in one intelligent command center.
          Every application, recruiter, follow-up, and interview — in one quiet place.
        </motion.p>

        <motion.div className="hero-ctas" {...fadeUp(0.45)}>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Create your account
            <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            className="btn btn-ghost-light"
            onClick={() => setFeaturesOpen((o) => !o)}
          >
            View features
          </button>
        </motion.div>
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