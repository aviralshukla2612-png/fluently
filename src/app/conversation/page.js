import ConversationWorkspace from "@/components/conversation/ConversationWorkspace";

export const metadata = {
  title: "AI Conversation Practice",
  description:
    "Have open-ended, multi-turn conversations with a friendly AI English tutor. Practice speaking or typing across authentic everyday scenarios.",
};

export default function ConversationPage() {
  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConversationWorkspace />
    </div>
  );
}
