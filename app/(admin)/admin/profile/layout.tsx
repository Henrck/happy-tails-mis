import type { ReactNode } from "react";
import "./profile-responsive.css";

/** Profile-only layout; keeps the mobile Safari date input inside its field. */
export default function ProfileResponsiveLayout({ children }: { children: ReactNode }) {
  return <div className="happytails-profile-responsive min-w-0 w-full">{children}</div>;
}
