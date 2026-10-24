import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account",
  description: "Create a free Fluently account to save your English learning streak and access your practice across devices.",
};

export default function RegisterPage() {
  return (
    <main className="w-full flex-1 flex items-center justify-center py-10 px-4">
      <RegisterForm />
    </main>
  );
}
