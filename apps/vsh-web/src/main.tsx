import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Shell } from "./ui/Shell.js";

const host = document.getElementById("vsh");

if (host !== null) {
  createRoot(host).render(
    <StrictMode>
      <Shell />
    </StrictMode>,
  );
}
