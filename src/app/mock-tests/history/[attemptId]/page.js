import { redirect } from "next/navigation";

export default async function HistoryAttemptRedirect({ params }) {
  const { attemptId } = await params;
  redirect(`/mock-tests/results/${attemptId}`);
}
