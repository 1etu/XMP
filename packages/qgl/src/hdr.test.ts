const night = hdrOf(
  JSON.parse(
    readFileSync(
      new URL("../../../resources/qgl/presets/night.json", import.meta.url),
      "utf8",
    ),
  ) as Preset,
);
const capture = {
  ...night,
  exposure: 1.04999995,
  whiteLevel: 0.899180974,
  glareThresh: 0.738857,
  glareLevel: 1.10245,
  glareSumPow: 0.557478,
  gaussianRadR: 1.23888,
  gaussianRadG: 1.43176,
  gaussianRadB: 1.55787,
  texSize: 7,
  texMaxMip: 6,
};
