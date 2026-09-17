import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bookmark,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  LayoutDashboard,
  MinusCircle,
  Plus,
  Settings,
  XCircle,
} from "lucide-react";
import { useUIState } from "@/store/UIStateContext";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const QUICK_FILTERS = [
  { status: "saved", label: "Saved", icon: Bookmark },
  { status: "interview", label: "Interview", icon: CalendarClock },
  { status: "offer", label: "Offer", icon: CheckCircle2 },
  { status: "rejected", label: "Rejected", icon: XCircle },
  { status: "withdrawn", label: "Withdrawn", icon: MinusCircle },
];

export function Sidebar() {
  const { openAdd } = useUIState();
  const location = useLocation();
  const activeStatus = new URLSearchParams(location.search).get("status");
  const onApplications = location.pathname === "/applications";

  return (
    <aside className="sidebar">
      <div className="sidebar-glow" aria-hidden />
      <Link to="/dashboard" className="sidebar-brand" aria-label="Track.AE home">
        <span className="sidebar-brand-name">TRACK.AE</span>
        <span className="sidebar-brand-tag">TRACK · APPLY · GROW</span>
      </Link>

      <button className="btn btn-primary btn-block sidebar-add" onClick={openAdd}>
        <Plus size={16} /> Add Application
      </button>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn("sidebar-link", isActive && "is-active")
              }
            >
              <Icon size={17} />
              {n.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-section-label">Quick filters</div>
      <div className="sidebar-quick">
        {QUICK_FILTERS.map((q) => {
          const Icon = q.icon;
          const active = onApplications && activeStatus === q.status;
          return (
            <Link
              key={q.status}
              to={`/applications?status=${q.status}`}
              className={cn("sidebar-link sidebar-quick-link", active && "is-active")}
            >
              <Icon size={15} />
              {q.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
