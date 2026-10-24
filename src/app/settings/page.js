import AccountSettings from "@/components/auth/AccountSettings";

export const metadata = {
  title: "Account Settings",
  description: "Manage your Shadowly learning profile, cloud synchronization preferences, and account privacy.",
};

export default function SettingsPage() {
  return (
    <main className="w-full flex-1 py-8 px-4 sm:px-6">
      <AccountSettings />
    </main>
  );
}
