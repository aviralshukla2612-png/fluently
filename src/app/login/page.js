import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your Fluently account to synchronize your English learning progress across devices.",
};

export default function LoginPage() {
  return (
    <main className="w-full flex-1 flex items-center justify-center py-10 px-4">
      <LoginForm />
    </main>
  );
}
