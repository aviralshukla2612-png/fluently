import ModulePage from "@/components/ModulePage";
import DictationWorkspace from "@/components/dictation/DictationWorkspace";

export const metadata = {
  title: "Dictation",
  description:
    "Train your listening comprehension by transcribing authentic spoken sentences in English.",
};

export default function DictationPage() {
  return (
    <ModulePage
      eyebrow="Listen • Type • Improve"
      title="Dictation Practice"
      description="Train your ear for natural connected speech, elisions, and contractions by typing exactly what you hear."
      badge="Listening Module"
    >
      <DictationWorkspace />
    </ModulePage>
  );
}
