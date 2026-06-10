import "./game-motifs.css";

/**
 * Tiny CSS "dioramas" — one per game — shown in the lineup cards. They animate
 * on hover (see the `.lineup-card:hover` rules in game-motifs.css) and recolor
 * with the live theme via `--primary` / `--arcade-*`. Purely decorative.
 */
export function GameMotif({ name }: { name: string }) {
  switch (name) {
    case "snake":
      return (
        <div className="m-cells" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      );

    case "tic-tac-toe":
      return (
        <div className="m-grid3" aria-hidden="true">
          <b className="x">×</b>
          <b />
          <b className="o">○</b>
          <b />
          <b className="x">×</b>
          <b />
          <b className="o">○</b>
          <b />
          <b className="x">×</b>
        </div>
      );

    case "2048":
      return (
        <div className="m-tiles" aria-hidden="true">
          <b style={{ background: "var(--primary)" }}>2</b>
          <b style={{ background: "var(--arcade-amber)" }}>4</b>
          <b style={{ background: "var(--arcade-magenta)" }}>8</b>
          <b style={{ background: "var(--arcade-cyan)" }}>16</b>
        </div>
      );

    case "memory-match":
      return (
        <div className="m-tiles" aria-hidden="true">
          <b style={{ background: "var(--secondary)", color: "var(--primary)" }}>★</b>
          <b style={{ background: "var(--secondary)" }} />
          <b style={{ background: "var(--secondary)" }} />
          <b style={{ background: "var(--secondary)", color: "var(--primary)" }}>★</b>
        </div>
      );

    case "whack-a-mole":
      return (
        <div className="m-mole" aria-hidden="true">
          <i className="up" />
          <i />
          <i className="up" />
        </div>
      );

    case "minesweeper":
      return (
        <div className="m-mine" aria-hidden="true">
          <i />
          <i />
          <i className="f" />
          <i />
          <i />
          <i />
          <i className="f" />
          <i />
          <i />
        </div>
      );

    case "pong":
      return (
        <div className="m-pong" aria-hidden="true">
          <span className="pad l" />
          <span className="ball" />
          <span className="pad r" />
        </div>
      );

    case "breakout":
      return (
        <div className="m-bricks" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative grid
            <i key={i} />
          ))}
        </div>
      );

    case "dino-runner":
      return (
        <div className="m-dino" aria-hidden="true">
          <span className="ground" />
          <span className="d" />
          <span className="c" />
        </div>
      );

    case "flappy":
      return (
        <div className="m-flap" aria-hidden="true">
          <span className="bird" />
          <span className="pipe t" />
          <span className="pipe b" />
        </div>
      );

    case "fruit-ninja":
      return (
        <div className="m-fruit" aria-hidden="true">
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
          <span className="blade" />
        </div>
      );

    case "stack":
      return (
        <div className="m-stack" aria-hidden="true">
          <span className="active" />
          <span />
          <span />
          <span />
        </div>
      );

    default:
      return null;
  }
}
