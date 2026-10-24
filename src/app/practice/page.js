import ModulePage from "@/components/ModulePage.jsx";
import SmartPracticeRunner from "@/components/practice/SmartPracticeRunner.jsx";

export const metadata = {
  title: "Smart Practice | Fluently",
  description:
    "Calibrated practice exercises targeting your specific English weaknesses with real-time adaptive difficulty.",
};

export default function PracticePage() {
  return (
    <ModulePage
      eyebrow="Targeted • Adaptive • Validated"
      title="Smart Practice Engine"
      description="Tackle calibrated exercises targeting your specific growth areas with automatic difficulty adaptation and instant feedback."
      badge="Practice Module"
    >
      <SmartPracticeRunner />
    </ModulePage>
  );
}
