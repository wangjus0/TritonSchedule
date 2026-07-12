import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TridentIcon } from "@/components/icons/TridentIcon";

export function PublicHeader() {
  const { user } = useAuth();
  const accountName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  return (
    <>
      <header className="landing-topbar absolute inset-x-0 top-0 z-10">
        <div className="landing-header-inner mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="spring-press flex items-center gap-2.5" aria-label="Triton Schedule home">
            <span className="landing-logo" aria-hidden>
              <TridentIcon className="h-8 w-8" />
            </span>
            <span className="landing-brand-text">TritonSchedule</span>
          </Link>

          <nav className="landing-nav-cluster landing-nav-center" aria-label="Primary navigation">
            <Link to="/search" className="landing-nav-link">
              Search
            </Link>
            <Link to="/calendar" className="landing-nav-link">
              Schedule
            </Link>
          </nav>

          <nav className="landing-nav-cluster landing-auth-nav" aria-label="Account navigation">
            {user ? (
              <Link to="/search" className="landing-nav-download">
                {accountName}
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-nav-link">
                  Log in
                </Link>
                <Link to="/signup" className="landing-nav-download">
                  <span>Sign up</span>
                  <ArrowRight className="landing-nav-download-icon" aria-hidden />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
