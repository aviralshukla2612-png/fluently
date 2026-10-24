import ModulePage from "@/components/ModulePage";
import VoicePractice from "@/components/voice/VoicePractice";

export const metadata = {
  title: "Say It",
  description:
    "Build spoken English confidence through targeted sentence shadowing, native voice playback, and live speech recording.",
};

export default function SayItPage() {
  return (
    <ModulePage
      eyebrow="Practice • Speak • Be Natural"
      title="Say It (Voice Engine)"
      description="Train your speaking muscles by listening to authentic native sentence rhythm and recording your voice in real time."
      badge="Phase 2 Active Engine"
    >
      <VoicePractice />
    </ModulePage>
  );
}
