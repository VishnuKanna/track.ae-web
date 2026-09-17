import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/styles/variables.css";
import "@/styles/globals.css";
import "@/styles/animations.css";
import "@/styles/components.css";
import "@/styles/layout.css";
import "@/styles/forms.css";
import "@/styles/pages.css";
import "@/styles/landing.css";

if (typeof document !== "undefined") {
  document.body.classList.add("dark-theme");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);