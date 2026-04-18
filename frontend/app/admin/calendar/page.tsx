"use client";

import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { CalendarWeekPlanner } from "../../../components/calendar/CalendarWeekPlanner";

export default function CalendarAdminPage() {
  return (
    <ProtectedRoute>
      <CalendarWeekPlanner variant="admin" />
    </ProtectedRoute>
  );
}
