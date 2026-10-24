import { redirect } from "next/navigation";

export default async function ExamIdPage({ params }) {
  const { examId } = await params;
  redirect(`/mock-tests/${examId}/instructions`);
}
