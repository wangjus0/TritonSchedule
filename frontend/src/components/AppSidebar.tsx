import { CalendarDays, Search } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Courses", url: "/", icon: Search },
  { title: "Schedule", url: "/calendar", icon: CalendarDays },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 w-full items-stretch px-4 sm:px-7">
        <div className="flex shrink-0 items-center pr-4 sm:pr-6">
          <NavLink
            to="/"
            aria-label="TritonSchedule home"
            className="relative block h-9 w-[156px] shrink-0 overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
          >
            <img
              src="/triton-schedule-brand-lockup.png"
              alt="TritonSchedule"
              width="1836"
              height="857"
              className="pointer-events-none absolute left-[-15px] top-[-24px] h-[86px] w-[184px] max-w-none select-none"
            />
          </NavLink>
        </div>

        <div className="my-4 hidden w-px bg-border sm:block" />

        <nav className="flex min-w-0 items-stretch sm:ml-2" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "relative inline-flex min-w-0 items-center justify-center gap-2 px-3 text-sm font-medium outline-none transition-colors focus-visible:bg-primary/[0.055] sm:px-5",
                  isActive
                    ? "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary sm:after:inset-x-5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden truncate sm:inline">{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
