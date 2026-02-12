import { Routes, Route, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { CalendarProvider } from "@/context/CalendarContext";
import SearchCourses from "./SearchCourses";
import CalendarPage from "./CalendarPage";

const Index = () => {
  const location = useLocation();

  return (
    <CalendarProvider>
      <div className="min-h-screen w-full">
        <AppSidebar />
        <main className="min-h-[calc(100vh-4rem)] bg-background/70 muted-grid sm:min-h-[calc(100vh-4rem)]">
          <div key={location.pathname} className="page-transition">
            <Routes>
              <Route path="/" element={<SearchCourses />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Routes>
          </div>
        </main>
        </div>
    </CalendarProvider>
  );
};

export default Index;
