import { profile, projects } from "@vsh/content";
import type { Page } from "../runtime/presentation.js";
import type { XmbShell } from "../runtime/shell.js";
import "./profile.css";

const ACTIONS = ["GitHub", "Website", "Details"] as const;
