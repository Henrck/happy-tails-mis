// Shared layout for the logged-in customer area (everything under /account/...).
// Later this will check the Supabase session and redirect to /sign-in if not logged in,
// and render a sidebar/nav for switching between Pets, Appointments, Notifications, Settings.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* TODO: sidebar nav component goes here */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
