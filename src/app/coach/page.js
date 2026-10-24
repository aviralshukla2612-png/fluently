import ModulePage from "@/components/ModulePage.jsx";
import AICoachWorkspace from "@/components/coach/AICoachWorkspace.jsx";

export const metadata = {
  title: "AI Learning Coach | Fluently",
  description:
    "Get clear, context-aware error explanations, master grammar rules, and receive personalized practice recommendations.",
};

export default function CoachPage() {
  return (
    <ModulePage
      eyebrow="Pedagogy • Explanations • Guidance"
      title="AI Learning Coach"
      description="Understand your mistakes with personalized explanations, discover underlying grammar rules, and receive targeted practice advice."
      badge="Coach Module"
    >
      <AICoachWorkspace />
    </ModulePage>
  );
}
