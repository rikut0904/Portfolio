"use client";

import SiteLayout from "../../components/layouts/SiteLayout";
import { CalendarWeekPlanner } from "../../components/calendar/CalendarWeekPlanner";

export default function CalendarPage() {
  return (
    <SiteLayout wide className="calendar-page">
      <CalendarWeekPlanner variant="public" />
    </SiteLayout>
  );
}
