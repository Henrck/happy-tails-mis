import ManagementSubnav from "@/components/admin/shared/ManagementSubnav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ManagementSubnav section="services" />
      {children}
    </>
  );
}
