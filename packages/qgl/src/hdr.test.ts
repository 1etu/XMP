const night = hdrOf(
  JSON.parse(
    readFileSync(
      new URL("../../../resources/qgl/presets/night.json", import.meta.url),
      "utf8",
    ),
  ) as Preset,
);