import { AccelMode, EPS, ease } from "./accel.js";
import { NATIVE_HZ, gainOf, step } from "./approach.js";
import { STILL } from "./spec.js";
import type { Spec } from "./spec.js";

const MS_PER_S = 1000;
