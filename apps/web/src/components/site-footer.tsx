import type { Route } from "next";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-3">
          <Link href="/" aria-label="GameKit UI home">
            <BrandWordmark />
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tiny, themeable browser games for shadcn. 2–4&nbsp;KB gzipped, zero external assets.
          </p>
        </div>
        <div className="flex gap-10 font-mono text-sm sm:gap-16">
          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.18em]">Explore</p>
            <Link href="/games" className="text-muted-foreground hover:text-primary">
              Games
            </Link>
            <Link href={"/docs" as Route} className="text-muted-foreground hover:text-primary">
              Docs
            </Link>
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              GitHub
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.18em]">
              For agents
            </p>
            <a href="/llms.txt" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
              llms.txt
            </a>
            <a
              href="/llms-full.txt"
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              llms-full.txt
            </a>
            <a
              href={`${siteConfig.github}/blob/main/skills/gamekitui/SKILL.md`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              Agent skill
            </a>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 pb-10 text-muted-foreground/70 text-xs">
        GameKit UI is an independent, unaffiliated community project. It is not built, sponsored, or
        endorsed by the shadcn/ui team.
      </div>
    </footer>
  );
}
