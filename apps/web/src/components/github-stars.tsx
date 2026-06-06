"use client";

import { buttonVariants } from "@gamekitui/ui/components/button";
import { cn } from "@gamekitui/ui/lib/utils";
import { Github, Star } from "lucide-react";
import * as React from "react";
import { siteConfig } from "@/lib/site";

const REPO = siteConfig.github.replace("https://github.com/", "");

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

/** "Star on GitHub" button with a live star count (graceful — hides the count if the fetch fails). */
export function GitHubStars({ className }: { className?: string }) {
  const [stars, setStars] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && typeof d.stargazers_count === "number") setStars(d.stargazers_count);
      })
      .catch(() => {
        /* rate-limited or offline — just show the button without a count */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <a
      href={siteConfig.github}
      target="_blank"
      rel="noreferrer"
      aria-label={`Star ${siteConfig.name} on GitHub`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "group gap-1.5", className)}
    >
      <Github className="size-4" />
      <span className="hidden sm:inline">Star</span>
      <Star className="size-3.5 transition-colors group-hover:fill-primary group-hover:text-primary" />
      {stars !== null && (
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {formatStars(stars)}
        </span>
      )}
    </a>
  );
}
