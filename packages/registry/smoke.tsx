/// Render smoke test: every game must render without throwing.
/// Effects/rAF don't run under server render, but state initializers and the
/// render body do — this catches board-generation and JSX crashes.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Breakout from "./src/breakout/breakout";
import DinoRunner from "./src/dino-runner/dino-runner";
import Flappy from "./src/flappy/flappy";
import FruitNinja from "./src/fruit-ninja/fruit-ninja";
import Game2048 from "./src/2048/2048";
import MemoryMatch from "./src/memory-match/memory-match";
import Minesweeper from "./src/minesweeper/minesweeper";
import Pong from "./src/pong/pong";
import Snake from "./src/snake/snake";
import TicTacToe from "./src/tic-tac-toe/tic-tac-toe";
import WhackAMole from "./src/whack-a-mole/whack-a-mole";

const games: [string, React.ComponentType<Record<string, unknown>>][] = [
  ["snake", Snake],
  ["tic-tac-toe", TicTacToe],
  ["2048", Game2048],
  ["memory-match", MemoryMatch],
  ["whack-a-mole", WhackAMole],
  ["minesweeper", Minesweeper],
  ["pong", Pong],
  ["breakout", Breakout],
  ["dino-runner", DinoRunner],
  ["flappy", Flappy],
  ["fruit-ninja", FruitNinja],
];

let failed = 0;
for (const [name, Comp] of games) {
  try {
    const html = renderToStaticMarkup(createElement(Comp, { autoFocus: false }));
    const ok = html.includes('role="application"');
    console.log(`${ok ? "✓" : "⚠"} ${name}${ok ? "" : " (rendered but no role=application)"}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${name}: ${(err as Error).message}`);
  }
}
console.log(failed === 0 ? "\nAll 11 games render without throwing." : `\n${failed} game(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
