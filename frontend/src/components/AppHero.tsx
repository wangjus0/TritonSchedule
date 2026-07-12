import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function AppHero({ eyebrow, title, subtitle, children, className }: AppHeroProps) {
  return (
    <section className={cn("app-hero", className)}>
      <div className="app-hero-inner mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {eyebrow && <p className="app-hero-eyebrow">{eyebrow}</p>}
        <h1 className="app-hero-title">{title}</h1>
        {subtitle && <p className="app-hero-subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
