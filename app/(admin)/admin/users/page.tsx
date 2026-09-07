"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchStaff, fetchCustomers } from "@/lib/supabase/users";
import { ToastProvider } from "@/components/ui/Toast";
import SearchFilterBar from "@/components/admin/users/SearchFilterBar";
import StaffTable from "@/components/admin/users/StaffTable";
import CustomerTable from "@/components/admin/users/CustomerTable";
import AddStaffModal from "@/components/admin/users/AddStaffModal";
import StaffDetailModal from "@/components/admin/users/StaffDetailModal";
import CustomerDetailModal from "@/components/admin/users/CustomerDetailModal";
import ArchiveModal from "@/components/admin/users/ArchiveModal";
import Pagination from "@/components/admin/Pagination";
import type { StaffMember, Customer, AccountStatus } from "@/lib/types/users";

const PAGE_SIZE = 10;

function UserManagementInner() {
  const [tab, setTab] = useState<"staff" | "customers">("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const [page, setPage] = useState(0);

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [staffResult, customerResult] = await Promise.all([fetchStaff(), fetchCustomers()]);
    setStaff(staffResult.staff);
    setCustomers(customerResult.customers);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function matchesFilters(name: string, id: string, email: string | null, phone: string | null, status: AccountStatus) {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q) ||
      (email ?? "").toLowerCase().includes(q) || (phone ?? "").includes(q);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus && status !== "archived";
  }

  const visibleStaff = useMemo(
    () => staff.filter((s) => matchesFilters(`${s.first_name} ${s.last_name}`, s.employee_id, s.email, s.phone_number, s.status)),
    [staff, search, statusFilter]
  );
  const visibleCustomers = useMemo(
    () => customers.filter((c) => matchesFilters(c.full_name, c.customer_id, c.email, c.phone_number, c.status)),
    [customers, search, statusFilter]
  );

  const archivedStaff = staff.filter((s) => s.status === "archived");
  const archivedCustomers = customers.filter((c) => c.status === "archived");

  const currentList = tab === "staff" ? visibleStaff : visibleCustomers;
  const pagedList = currentList.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function changeTab(next: "staff" | "customers") {
    setTab(next);
    setPage(0);
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-brand-pink">User Account Management</h1>
        <div className="flex gap-2">
          {tab === "staff" && (
            <button onClick={() => setAddStaffOpen(true)} className="bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-5 py-2 rounded-full transition-colors">
              Add Account
            </button>
          )}
          <button onClick={() => setArchiveOpen(true)} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
            Archive
          </button>
        </div>
      </div>

      <div className="mt-5 inline-flex bg-white rounded-full border border-pink-100 p-1">
        <button onClick={() => changeTab("staff")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${tab === "staff" ? "bg-brand-pink text-white" : "bg-white text-zinc-800"}`}>
          Staff Management
        </button>
        <button onClick={() => changeTab("customers")} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${tab === "customers" ? "bg-brand-pink text-white" : "bg-white text-zinc-800"}`}>
          User Management
        </button>
      </div>

      <div className="mt-5">
        <SearchFilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(0); }} status={statusFilter} onStatusChange={(v) => { setStatusFilter(v); setPage(0); }} />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-pink-100 overflow-hidden animate-pulse">
            <div className="h-10 bg-brand-pink/50" />
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-zinc-100 border-t border-pink-50" />)}
          </div>
        ) : tab === "staff" ? (
          <StaffTable staff={pagedList as StaffMember[]} onView={setSelectedStaff} />
        ) : (
          <CustomerTable customers={pagedList as Customer[]} onView={setSelectedCustomer} />
        )}
      </div>

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={currentList.length} onPageChange={setPage} />
      </div>

      {addStaffOpen && <AddStaffModal onClose={() => setAddStaffOpen(false)} onCreated={loadData} />}
      {selectedStaff && <StaffDetailModal staff={selectedStaff} onClose={() => setSelectedStaff(null)} onChanged={loadData} />}
      {selectedCustomer && <CustomerDetailModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onChanged={loadData} />}
      {archiveOpen && (
        <ArchiveModal archivedStaff={archivedStaff} archivedCustomers={archivedCustomers} onClose={() => setArchiveOpen(false)} onChanged={loadData} />
      )}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <ToastProvider>
      <UserManagementInner />
    </ToastProvider>
  );
}
