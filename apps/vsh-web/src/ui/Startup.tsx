import type { RefObject } from "react";

export function Startup({
  canvasRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}): React.JSX.Element {
  return (
    <div className="vsh-startup" aria-hidden="true">
      <canvas ref={canvasRef} className="vsh-startup-texture" />
    </div>
  );
}
