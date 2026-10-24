import ModulePage from "@/components/ModulePage";
import ProgressDashboard from "@/components/progress/ProgressDashboard";

export const metadata = {
  title: "Progress",
  description:
    "Review your English learning milestones, daily streak, practice metrics, and module completion rates.",
};

export default function ProgressPage() {
  return (
    <ModulePage
      eyebrow="Track • Reflect • Improve"
      title="Learning Analytics"
      description="Reflect on your habit consistency, active listening drills, and progressive mastery across all modules over time."
      badge="Analytics Module"
    >
      <ProgressDashboard />
    </ModulePage>
  );
}
