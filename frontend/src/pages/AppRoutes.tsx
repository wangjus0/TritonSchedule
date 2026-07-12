import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { CalendarProvider } from "@/context/CalendarContext";
import SearchCourses from "./SearchCourses";
import CalendarPage from "./CalendarPage";

export default function AppRoutes() {
  return (
    <CalendarProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/search" element={<SearchCourses />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Route>
      </Routes>
    </CalendarProvider>
  );
}
