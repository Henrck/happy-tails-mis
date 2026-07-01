// Shared layout for all auth pages (sign-in, sign-up, forgot-password, verify-email).
// This gives auth pages a plain centered-card look, with no header/nav from the main site.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
