"use client";

import { Button } from "@gamekitui/ui/components/button";
import { Check, Copy } from "lucide-react";
import * as React from "react";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label="Copy to clipboard"
      className={className}
    >
      {copied ? <Check className="text-foreground" /> : <Copy className="text-muted-foreground" />}
    </Button>
  );
}
