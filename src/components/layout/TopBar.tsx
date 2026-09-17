import { Link, NavLink } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/store/AuthContext";
import { useUIState } from "@/store/UIStateContext";
import { Avatar } from "@/components/ui/Avatar";
import { getAvatarUrl } from "@/lib/auth";
import { NotificationPanel, useNotificationCount } from "@/components/notifications/NotificationPanel";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/applications", label: "Applications" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

export function TopBar() {
  const { profile, user } = useAuth();
  const { notifsOpen, openNotifs, closeNotifs } = useUIState();
  const count = useNotificationCount();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/dashboard" className="brand" aria-label="Track.AE home">
          TRACK.AE<span className="brand-dot" />
        </Link>

        <nav className="topbar-nav" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => cn("nav-link", isActive && "is-active")}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          <div className="anchor-pos">
            <button
              className="icon-btn notif-bell"
              onClick={notifsOpen ? closeNotifs : openNotifs}
              aria-label="Notifications"
              aria-expanded={notifsOpen}
            >
              <Bell size={18} />
              {count > 0 && <span className="notif-dot" aria-hidden />}
            </button>
            <div className="dropdown-abs">
              <NotificationPanel open={notifsOpen} onClose={closeNotifs} />
            </div>
          </div>

          <Link to="/settings" className="topbar-user" aria-label="Open settings">
            <Avatar name={profile?.full_name} src={getAvatarUrl(profile, user)} size="sm" />
            <span className="topbar-user-name hidden-mobile">
              {profile?.full_name?.split(" ")[0] ?? "Account"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}