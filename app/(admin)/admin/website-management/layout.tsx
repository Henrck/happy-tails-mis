import ManagementSubnav from "@/components/admin/shared/ManagementSubnav";
import "../management-narrow-fixes.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ht-website-management min-w-0 w-full">
      <ManagementSubnav section="website" />
      {children}
    </div>
  );
}
