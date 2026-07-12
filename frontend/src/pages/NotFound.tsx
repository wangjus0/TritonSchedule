import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen page-shell auth-shell">
      <PublicHeader />

      <main className="auth-page mx-auto w-full max-w-6xl">
        <section className="auth-copy">
          <h1 className="auth-title">Page not found</h1>
          <p className="auth-subtitle">That route is not part of TritonSchedule.</p>
        </section>

        <div className="auth-card w-full text-center">
          <p className="data-mono text-sm font-semibold text-[var(--design-primary)]">404</p>
          <p className="mt-3 text-[22px] font-semibold text-[var(--design-ink)]">
            Head back to planning
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Search courses or return home from here.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="aqua-btn border-0">
              <Link to="/search">Search courses</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
