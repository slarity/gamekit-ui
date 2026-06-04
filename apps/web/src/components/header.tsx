"use client";

import { buttonVariants } from "@gamekitui/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@gamekitui/ui/components/sheet";
import { cn } from "@gamekitui/ui/lib/utils";
import { Github, Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/docs", label: "Docs" },
  { href: "/games", label: "Games" },
] as const;

const GITHUB_URL = "https://github.com/anishsrinivasan/gamekit-ui";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="text-xl leading-none" aria-hidden="true">
        👾
      </span>
      <span>GameKit UI</span>
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "rounded-sm px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground",
                isActive(item.href) && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}
          >
            <Github className="size-4" />
          </a>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {NAV.map((item) => (
                  <SheetClose
                    key={item.href}
                    render={
                      <Link
                        href={item.href as Route}
                        className={cn(
                          "rounded-sm px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
                          isActive(item.href) && "bg-muted text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    }
                  />
                ))}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                >
                  GitHub
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
