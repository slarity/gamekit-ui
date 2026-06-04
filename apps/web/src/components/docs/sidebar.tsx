"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type DocsNavItem = { title: string; url: string };
export type DocsNavGroup = { title: string; items: DocsNavItem[] };

export function DocsSidebar({ groups }: { groups: DocsNavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 text-sm">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-2 py-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {group.title}
          </p>
          {group.items.map((item) => {
            const active = pathname === item.url;
            return (
              <Link
                key={item.url}
                href={item.url as Route}
                className={cn(
                  "rounded-sm px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
