"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "primary";
  hover?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function GlassCard({
  className,
  variant = "default",
  hover = false,
  as: Comp = "div",
  children,
  ...props
}: GlassCardProps) {
  const variantClass =
    variant === "strong"
      ? "glass-strong"
      : variant === "primary"
      ? "glass-primary"
      : "glass";
  return React.createElement(
    Comp,
    {
      className: cn(
        variantClass,
        "rounded-2xl",
        hover && "glass-hover cursor-pointer",
        className
      ),
      ...props,
    },
    children
  );
}
