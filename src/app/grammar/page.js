import ModulePage from "@/components/ModulePage";
import GrammarWorkspace from "@/components/grammar/GrammarWorkspace";

export const metadata = {
  title: "Grammar",
  description:
    "Learn English grammar structures in context with clear explanations, formulas, real-world examples, and interactive exercises.",
};

export default function GrammarPage() {
  return (
    <ModulePage
      eyebrow="Build • Understand • Use"
      title="Grammar in Context"
      description="Grasp natural English sentence architecture through communicative patterns, structural formulas, and interactive exercises."
      badge="Structure Module"
    >
      <GrammarWorkspace />
    </ModulePage>
  );
}
