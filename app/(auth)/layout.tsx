// Shared layout for all auth pages (sign-in, sign-up, forgot-password, verify-email).
// The background is a full-viewport layer so it remains correctly sized on desktop,
// tablet, and mobile without affecting the auth card's layout.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#f9e3ec]">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/auth-background.png')" }}
      />

      <div className="relative z-0 flex min-h-screen min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
