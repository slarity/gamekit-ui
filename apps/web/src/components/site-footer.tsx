import type { Route } from "next";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          Tiny, themeable browser games for shadcn. ≤6&nbsp;KB each, zero external assets.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/games" className="hover:text-foreground">
            Games
          </Link>
          <Link href={"/docs" as Route} className="hover:text-foreground">
            Docs
          </Link>
          <a
            href="https://github.com/anishsrinivasan/gamekit-ui"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 pb-8 text-muted-foreground/70 text-xs">
        GameKit UI is an independent, unaffiliated community project. It is not built, sponsored, or
        endorsed by the shadcn/ui team.
      </div>
    </footer>
  );
}
