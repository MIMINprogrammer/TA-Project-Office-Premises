"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getDiffSpans, UNCONFIRMED_MARKER } from "@/lib/clause-engine";

interface DiffViewerProps {
  original: string;
  amended: string;
  className?: string;
  compact?: boolean;
}

// Side-by-side diff view (PRD §6.5, §10.1 — side-by-side with highlight)
export function DiffViewer({
  original,
  amended,
  className,
  compact,
}: DiffViewerProps) {
  const segments = React.useMemo(
    () => getDiffSpans(original, amended),
    [original, amended]
  );
  const hasPlaceholder = amended.includes(UNCONFIRMED_MARKER);

  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "md:grid-cols-2", className)}>
      {/* Original */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Peruntukan Asal (Templat)
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">
          {original}
        </p>
      </div>

      {/* Amended */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Cadangan Pindaan
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {hasPlaceholder ? (
            <span className="diff-placeholder">{amended}</span>
          ) : (
            segments.map((seg, i) => (
              <React.Fragment key={i}>
                {seg.isNew ? (
                  <span className="diff-add">{seg.text}</span>
                ) : (
                  seg.text
                )}
              </React.Fragment>
            ))
          )}
        </p>
      </div>
    </div>
  );
}
