"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TocItem = { title: React.ReactNode; url: string; depth: number };

export function DocsToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.url.replace(/^#/, "")))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "0% 0% -70% 0%", threshold: 1 },
    );
    for (const h of headings) observer.observe(h);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">On this page</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const id = item.url.replace(/^#/, "");
          return (
            <li key={item.url} style={{ paddingLeft: `${Math.max(0, item.depth - 2) * 12}px` }}>
              <a
                href={item.url}
                className={cn(
                  "block py-0.5 text-muted-foreground transition-colors hover:text-foreground",
                  activeId === id && "font-medium text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
