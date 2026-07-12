import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, LogOut, Search } from "lucide-react";
import { useMemo, type ComponentType } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCalendar } from "@/context/CalendarContext";
import { Button } from "@/components/ui/button";
import { TridentIcon } from "@/components/icons/TridentIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  showCount?: boolean;
}

const navItems: NavItem[] = [
  { title: "Search", url: "/search", icon: Search },
  { title: "Schedule", url: "/calendar", icon: CalendarDays, showCount: true },
];

export function AppLayout() {
  const location = useLocation();
  const { user, signOut, isConfigured } = useAuth();
  const { events } = useCalendar();
  const accountName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  const courseCount = useMemo(() => {
    return new Set(
      events.filter((event) => event.isCourse && event.courseId).map((event) => event.courseId)
    ).size;
  }, [events]);

  return (
    <div className="app-shell page-shell">
      {/* ── Desktop sidebar ── */}
      <aside className="app-sidebar" aria-label="Main navigation">
        <Link to="/" className="app-sidebar-brand spring-press">
          <span className="landing-logo" aria-hidden>
            <TridentIcon className="h-7 w-7" />
          </span>
          <span className="landing-brand-text">TritonSchedule</span>
        </Link>

        <p className="app-sidebar-section">Plan</p>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={({ isActive }) => cn("app-sidebar-row", isActive && "is-active")}
              >
                <span className="app-sidebar-icon" aria-hidden>
                  <Icon className="h-[1.15rem] w-[1.15rem]" />
                </span>
                {item.title}
                {item.showCount && courseCount > 0 && (
                  <span className="app-sidebar-count" aria-label={`${courseCount} courses`}>
                    {courseCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="app-sidebar-footer">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="app-sidebar-row w-full justify-start"
                  aria-label="Account menu"
                >
                  <span
                    className="app-sidebar-icon flex h-7 w-7 items-center justify-center rounded-full bg-[var(--design-primary)] text-xs font-semibold text-white"
                    aria-hidden
                  >
                    {accountName.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{accountName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuLabel className="truncate font-normal">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isConfigured ? (
            <div className="flex flex-col gap-2 px-1">
              <Link to="/login" className="btn-utility h-10">
                Log in
              </Link>
              <Link to="/signup" className="aqua-btn flex h-10 items-center justify-center text-sm">
                Sign up
              </Link>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-col pb-24 lg:pb-8">
        {/* mobile top bar */}
        <header className="app-mobile-topbar">
          <Link to="/" className="spring-press flex items-center gap-2.5">
            <span className="landing-logo h-9 w-9" aria-hidden>
              <TridentIcon className="h-6 w-6" />
            </span>
            <span className="landing-brand-text !block">TritonSchedule</span>
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="landing-account-button" aria-label="Account menu">
                  {accountName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isConfigured ? (
            <Link to="/signup" className="landing-nav-download">
              Sign up
            </Link>
          ) : null}
        </header>

        <main className="min-w-0 flex-1">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="app-bottom-nav" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) => cn("app-bottom-link spring-press", isActive && "is-active")}
            >
              <span className="relative" aria-hidden>
                <Icon className="h-[1.35rem] w-[1.35rem]" />
                {item.showCount && courseCount > 0 && (
                  <span className="app-bottom-badge">{courseCount}</span>
                )}
              </span>
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
