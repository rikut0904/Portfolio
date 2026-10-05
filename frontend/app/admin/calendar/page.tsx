"use client";

import ProtectedRoute from "../../../components/admin/ProtectedRoute";
import { AdminPageContent } from "../../../components/admin/AdminPageShell";
import { CalendarWeekPlanner } from "../../../components/calendar/CalendarWeekPlanner";

export default function CalendarAdminPage() {
  return (
    <ProtectedRoute>
      <AdminPageContent>
        <CalendarWeekPlanner variant="admin" />
      </AdminPageContent>
    </ProtectedRoute>
  );
}
