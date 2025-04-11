import { verified } from "@vsh/resource";

export const NATIVE_HZ = verified(60);

const BOOST = verified(Math.fround(1.000001));
const SHORT = [1, 0.96153849, 0.78125, 0.63694263, 0.52910054].map(verified);
const SLOPE = verified(Math.fround(0.33333299));
const INTERCEPT = verified(Math.fround(2.2));