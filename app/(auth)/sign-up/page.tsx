import { redirect } from "next/navigation";

// Customer self-registration now takes place through Google OAuth on /sign-in.
// This route is deliberately not an alternative email/password signup flow.
export default function SignUpPage() {
  redirect("/sign-in");
}
