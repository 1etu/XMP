type Binding = "decide" | "cancel" | "options";

export function ControlGlyph({ binding }: { binding: Binding }): React.JSX.Element {
  return (
    <svg
      className="vsh-control-glyph"
      viewBox="0 0 30 30"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {import.meta.env.DEV ? (
        <image
          href={`/original/system/${binding === "decide" ? "cross" : binding === "cancel" ? "circle" : "triangle"}.png`}
          width="30"
          height="30"
        />
      ) : binding === "decide" ? (
        <path d="m7 7 16 16M23 7 7 23" />
      ) : binding === "cancel" ? (
        <circle cx="15" cy="15" r="9" />
      ) : (
        <path d="m15 6 10 17H5Z" />
      )}
    </svg>
  );
}
