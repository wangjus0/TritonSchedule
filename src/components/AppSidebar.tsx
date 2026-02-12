import { Calendar, Search } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { TridentIcon } from "@/components/icons/TridentIcon";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Search Courses", url: "/", icon: Search },
  { title: "Calendar", url: "/calendar", icon: Calendar },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border/80 bg-sidebar/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-2 px-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-0 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/85 shadow-[0_10px_24px_hsl(var(--primary)/0.3)]">
            <TridentIcon className="h-5 w-5 text-primary-foreground [stroke-width:2.6]" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/75">UCSD Planner</p>
            <h2 className="text-sm font-medium tracking-[0.01em] text-foreground/90">Triton Schedule</h2>
          </div>
        </div>

        <nav className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 sm:justify-start",
                  isActive
                    ? "border-primary/45 bg-primary/20 text-foreground shadow-[0_8px_24px_hsl(var(--primary)/0.22)]"
                    : "border-transparent text-muted-foreground hover:border-sidebar-border/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
