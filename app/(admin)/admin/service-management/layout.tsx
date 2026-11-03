import ManagementSubnav from "@/components/admin/shared/ManagementSubnav";
import "../management-narrow-fixes.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ht-service-management min-w-0 w-full">
      <ManagementSubnav section="services" />
      {children}
    </div>
  );
}
