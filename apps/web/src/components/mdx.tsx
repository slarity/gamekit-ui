import Link from "next/link";
import type { ComponentPropsWithoutRef, ComponentType } from "react";
import { CopyButton } from "@/components/copy-button";
import { GameInfo } from "@/components/game-info";
import { GamePreview } from "@/components/game-preview";
import { InstallCommand } from "@/components/install-command";
import { cn } from "@/lib/utils";

/** Live game preview embedded in docs, with an Install row. */
function ComponentPreview({ name }: { name: string }) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <div className="grid place-items-center bg-dots p-6">
        <div className="mx-auto w-full max-w-[380px]">
          <GamePreview name={name} autoFocus={false} />
        </div>
      </div>
      <div className="border-t bg-card p-3">
        <InstallCommand name={name} />
      </div>
    </div>
  );
}

function Pre({ className, children, ...props }: ComponentPropsWithoutRef<"pre">) {
  // shiki nests the raw code string inside <code>{string}</code>
  const raw =
    typeof children === "object" && children && "props" in children
      ? // @ts-expect-error shiki nests the code string under props.children
        (children.props?.children ?? "")
      : "";
  return (
    <div className="not-prose group relative my-4">
      <pre
        className={cn(
          "max-h-[600px] overflow-x-auto rounded-lg border p-4 text-[0.8125rem] leading-relaxed",
          className,
        )}
        {...props}
      >
        {children}
      </pre>
      {typeof raw === "string" && raw ? (
        <div className="absolute top-2.5 right-2.5 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton value={raw.replace(/\n$/, "")} />
        </div>
      ) : null}
    </div>
  );
}

// biome-ignore lint/suspicious/noExplicitAny: MDX maps mix intrinsic + custom components
export const mdxComponents: Record<string, ComponentType<any>> = {
  ComponentPreview,
  GameInfo,
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="mt-2 scroll-m-20 font-semibold text-3xl tracking-tight" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-12 scroll-m-20 border-b pb-2 font-semibold text-xl tracking-tight first:mt-0"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 scroll-m-20 font-semibold text-lg tracking-tight" {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="mt-6 scroll-m-20 font-medium tracking-tight" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 leading-7 text-foreground/90 first:mt-0" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-4 ml-6 list-disc [&>li]:mt-2" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-4 ml-6 list-decimal [&>li]:mt-2" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li className="leading-7" {...props} />,
  a: ({ href = "", ...props }: ComponentPropsWithoutRef<"a">) =>
    href.startsWith("/") ? (
      <Link
        href={href as never}
        className="font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
        {...props}
      />
    ) : (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        className="font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
        {...props}
      />
    ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="mt-4 border-l-2 pl-4 text-muted-foreground italic" {...props} />
  ),
  hr: (props: ComponentPropsWithoutRef<"hr">) => <hr className="my-8 border-border" {...props} />,
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="not-prose my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/40 text-left" {...props} />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => <tr className="border-b last:border-0" {...props} />,
  th: (props: ComponentPropsWithoutRef<"th">) => <th className="p-3 font-medium" {...props} />,
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="p-3 align-top text-muted-foreground [&_code]:text-foreground" {...props} />
  ),
  pre: Pre,
};
