import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CalendarProvider } from "@/context/CalendarContext";
import SearchCourses from "./SearchCourses";
import CalendarPage from "./CalendarPage";

const Index = () => {
  return (
    <CalendarProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 bg-background overflow-auto">
            <Routes>
              <Route path="/" element={<SearchCourses />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Routes>
          </main>
        </div>
      </SidebarProvider>
    </CalendarProvider>
  );
};

export default Index;
