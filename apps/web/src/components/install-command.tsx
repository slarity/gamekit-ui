import { CopyButton } from "@/components/copy-button";

export function InstallCommand({ name }: { name: string }) {
  const command = `npx shadcn@latest add @gamekitui/${name}`;
  return (
    <div className="flex items-center gap-2 bg-muted/50 py-1.5 pr-1.5 pl-3 rounded-lg ring-1 ring-foreground/10">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-foreground text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="select-none text-muted-foreground">$ </span>
        {command}
      </code>
      <CopyButton value={command} />
    </div>
  );
}
