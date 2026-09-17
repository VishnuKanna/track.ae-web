import { NavLink } from "react-router-dom";
import { BarChart3, Home, Settings, ClipboardList } from "lucide-react";
import { cn } from "@/lib/cn";

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => cn("bn-item", isActive && "is-active")}
      >
        <Home size={20} className="bn-icon" />
        Home
      </NavLink>
      <NavLink
        to="/applications"
        className={({ isActive }) => cn("bn-item", isActive && "is-active")}
      >
        <ClipboardList size={20} className="bn-icon" />
        Jobs
      </NavLink>
      <NavLink
        to="/analytics"
        className={({ isActive }) => cn("bn-item", isActive && "is-active")}
      >
        <BarChart3 size={20} className="bn-icon" />
        Analytics
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) => cn("bn-item", isActive && "is-active")}
      >
        <Settings size={20} className="bn-icon" />
        More
      </NavLink>
    </nav>
  );
}