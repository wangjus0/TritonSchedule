import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarRange, LayoutGrid, ListFilter, Search } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";

const quickSearches = ["CSE 110", "MATH 20C", "COGS 108"];
const previewCourses = [
  { code: "CSE 110", title: "Software Engineering", detail: "Mon Wed Fri, 10a", color: "var(--design-action)" },
  { code: "MATH 20C", title: "Vector Calculus", detail: "Tue Thu, 12p", color: "var(--design-blue-mid)" },
  { code: "COGS 108", title: "Data Science", detail: "Fri, 2p", color: "var(--design-secondary)" },
];
const weekPreview = [
  { day: "Mon", meetings: [{ code: "CSE 110", time: "10a", color: "var(--design-action)" }] },
  { day: "Tue", meetings: [{ code: "MATH 20C", time: "12p", color: "var(--design-blue-mid)" }] },
  { day: "Wed", meetings: [{ code: "CSE 110", time: "10a", color: "var(--design-action)" }] },
  { day: "Thu", meetings: [{ code: "MATH 20C", time: "12p", color: "var(--design-blue-mid)" }] },
  { day: "Fri", meetings: [{ code: "COGS 108", time: "2p", color: "var(--design-secondary)" }] },
];

const features = [
  {
    num: "01",
    icon: Search,
    band: "var(--design-action)",
    title: "Find the right course",
    body: "Start with a course, department, or instructor and keep the live UCSD catalog one keystroke away.",
  },
  {
    num: "02",
    icon: ListFilter,
    band: "var(--design-blue-mid)",
    title: "Compare sections",
    body: "Scan meeting days, section type, seats, and professor ratings before you commit to anything.",
  },
  {
    num: "03",
    icon: CalendarRange,
    band: "var(--design-secondary)",
    title: "Shape the week",
    body: "Drop sections into a weekly grid and swap them instantly as your plan changes.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [heroQuery, setHeroQuery] = useState("");

  const submitHeroSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = heroQuery.trim();

    if (query) {
      sessionStorage.setItem("searchCoursesQuery", query);
    } else {
      sessionStorage.removeItem("searchCoursesQuery");
    }

    navigate("/search");
  };

  return (
    <div className="min-h-screen page-shell">
      <PublicHeader />

      <section className="landing-hero">
        <div className="landing-hero-inner mx-auto max-w-6xl px-4 sm:px-6">
          <div className="landing-hero-copy">
            <h1 className="landing-title">
              <span>Plan UCSD courses</span>
              <span className="landing-title-accent">with less guesswork.</span>
            </h1>
            <p className="landing-lead">
              Search live courses, compare sections side by side, and place the best meetings into a
              weekly grid. No spreadsheet required.
            </p>

            <form className="landing-hero-search" onSubmit={submitHeroSearch}>
              <label className="sr-only" htmlFor="landing-course-search">
                Search UCSD courses
              </label>
              <Search className="h-5 w-5 shrink-0" aria-hidden />
              <input
                id="landing-course-search"
                type="search"
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Course, professor, or subject"
                aria-label="Search UCSD courses"
              />
              <button type="submit">
                <span>Search</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </form>

            <div className="landing-search-examples" aria-label="Example searches">
              <span>Popular searches</span>
              {quickSearches.map((query) => (
                <button key={query} type="button" onClick={() => setHeroQuery(query)}>
                  {query}
                </button>
              ))}
            </div>
          </div>

          <aside className="landing-workspace-panel" aria-label="Weekly schedule preview">
            <div className="landing-workspace-header">
              <div>
                <p>Course workspace</p>
                <h2>SP26 draft week</h2>
              </div>
              <span>3 courses</span>
            </div>

            <div className="landing-workspace-body">
              <div className="landing-course-panel">
                <div className="landing-course-search">
                  <Search className="h-4 w-4" aria-hidden />
                  <span>CSE 110</span>
                </div>

                <div className="landing-course-list">
                  {previewCourses.map((course) => (
                    <div key={course.code} className="landing-course-card">
                      <span style={{ backgroundColor: course.color }}>{course.code}</span>
                      <div>
                        <strong>{course.title}</strong>
                        <p>{course.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="landing-week-preview" aria-label="Example weekly schedule">
                {weekPreview.map((day) => (
                  <div key={day.day} className="landing-week-day">
                    <span>{day.day}</span>
                    {day.meetings.map((meeting) => (
                      <div
                        key={`${day.day}-${meeting.code}`}
                        className="landing-week-meeting"
                        style={{ backgroundColor: meeting.color }}
                      >
                        <strong>{meeting.code}</strong>
                        <p>{meeting.time}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-workspace-note">
              Live course search, section choice, and weekly fit stay connected.
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section landing-feature-band" aria-label="What TritonSchedule helps with">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="landing-section-head">
            <span className="landing-kicker">Everything in one place</span>
            <h2 className="landing-section-title">Decide faster, before enrollment.</h2>
            <p className="landing-section-lead">
              Course discovery, section context, and weekly fit — together, so you stop juggling tabs
              and spreadsheets.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.num} className="feature-card">
                  <div className="feature-card-band" style={{ backgroundColor: feature.band }}>
                    <span className="feature-card-num">{feature.num}</span>
                    <Icon aria-hidden />
                  </div>
                  <div className="feature-card-body">
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-cta" aria-label="Start planning">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="landing-cta">
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <h2 className="landing-cta-title">
                  Build your quarter in minutes.
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--design-muted)]">
                  No account needed to start — search live courses and draft a week right now.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
                <Link
                  to="/search"
                  className="aqua-btn btn-ink inline-flex h-12 items-center justify-center gap-2 px-6 text-[15px]"
                >
                  Start planning
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/calendar"
                  className="btn-secondary inline-flex h-12 items-center justify-center px-6 text-[15px]"
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  View schedule
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} TritonSchedule · Built for UCSD students.</p>
          <div className="flex items-center gap-5">
            <Link to="/search" className="hover:text-[var(--design-ink)]">
              Search
            </Link>
            <Link to="/calendar" className="hover:text-[var(--design-ink)]">
              Schedule
            </Link>
            <Link to="/login" className="hover:text-[var(--design-ink)]">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
