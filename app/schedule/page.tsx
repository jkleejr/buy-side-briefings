import ScheduleCalendar from "@/components/schedule-calendar";
import { getScheduleData } from "@/lib/schedule";

export const metadata = {
  title: "Schedule — Buy-Side Briefings",
  description:
    "A full month calendar of every dated catalyst we track: Fed and Bank of Japan decisions, CPI, jobs and PCE prints, earnings dates, and the routine's hand-written events — past months included.",
};

// Earnings and FRED dates are fetched live; half-hourly is plenty for a
// calendar whose rows move on the scale of days.
export const revalidate = 1800;

export default async function SchedulePage() {
  const data = await getScheduleData();
  return <ScheduleCalendar data={data} />;
}
