import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export function NotFound() {
  return (
    <div className="nf">
      <div className="nf-code">404</div>
      <div className="faint" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Compass size={16} /> This page drifted off the radar.
      </div>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 12 }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
    </div>
  );
}