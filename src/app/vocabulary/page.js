import ModulePage from "@/components/ModulePage";
import VocabularyWorkspace from "@/components/vocabulary/VocabularyWorkspace";

export const metadata = {
  title: "Vocabulary",
  description:
    "Explore essential English vocabulary, collocations, definitions, flashcards, quizzes, and spaced review.",
};

export default function VocabularyPage() {
  return (
    <ModulePage
      eyebrow="Explore • Learn • Remember"
      title="Vocabulary Bank"
      description="Build a high-retention lexical repertoire with phonetic guides, usage collocations, interactive flashcards, and spaced repetition."
      badge="Lexical Module"
    >
      <VocabularyWorkspace />
    </ModulePage>
  );
}
