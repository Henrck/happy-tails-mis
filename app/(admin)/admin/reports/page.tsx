"use client";
// HappyTails Report Management: 3 clear reports.
// Service = appointments + charges; Inventory = stock; Sales = invoice cash ledger.
// Transaction Reports duplicate tab was merged into Service Reports.
import { useState, useMemo, useEffect } from "react";
import { Inter } from "next/font/google";
import { sortRows, nextSortState, type SortDirection } from "@/lib/utils/sort";

import type { ServiceReport } from "@/lib/data/service-reports-mock";
import type { InventoryReportRow } from "@/lib/data/inventory-reports-mock";
import type { SalesReportRow } from "@/lib/data/sales-reports-mock";
import { fetchServiceReports } from "@/lib/supabase/reports";
import { fetchInventoryReportRows } from "@/lib/supabase/inventory-reports";
import { fetchSalesReportRows } from "@/lib/supabase/sales";

import ReportsHeader from "@/components/admin/reports/ReportsHeader";
import ReportTabs, { type ReportTab } from "@/components/admin/reports/ReportTabs";
import ReportStats from "@/components/admin/reports/ReportStats";
import ReportFooter from "@/components/admin/reports/ReportFooter";
import ReportDetailModal from "@/components/admin/reports/ReportDetailModal";

import FilterToolbar, { type FilterState } from "@/components/admin/reports/FilterToolbar";
import ReportTable from "@/components/admin/reports/ReportTable";
import InventoryFilterToolbar, { type InventoryFilterState } from "@/components/admin/reports/InventoryFilterToolbar";
import InventoryReportTable from "@/components/admin/reports/InventoryReportTable";
import SalesFilterToolbar, { type SalesFilterState } from "@/components/admin/reports/SalesFilterToolbar";
import SalesReportTable from "@/components/admin/reports/SalesReportTable";

const inter = Inter({ subsets: ["latin"] });
const emptyServiceFilters: FilterState = {
  search: "", reportType: "All Types", source: "all", fromDate: "", toDate: "", status: "all",
};
const emptyInventoryFilters: InventoryFilterState = {
  search: "", category: "All Categories", expiration: "all", status: "all", unit: "All Units",
};
const emptySalesFilters: SalesFilterState = {
  search: "", fromDate: "", toDate: "", category: "All Categories",
};
const PAGE_SIZE_DEFAULT = 10;

export default function ReportManagementPage() {
  const [tab, setTab] = useState<ReportTab>("service");
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
  const [inventoryReports, setInventoryReports] = useState<InventoryReportRow[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [service, inventory, sales] = await Promise.all([
        fetchServiceReports(),
        fetchInventoryReportRows(),
        fetchSalesReportRows(),
      ]);
      if (!mounted) return;
      setServiceReports(service.rows);
      setInventoryReports(inventory.rows);
      setSalesReports(sales.rows);
      setReportsError(service.error ?? inventory.error ?? sales.error ?? null);
      setReportsLoading(false);
    }
    load().catch((error: unknown) => {
      if (mounted) {
        setReportsError(error instanceof Error ? error.message : "Couldn't load report data.");
        setReportsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Service Reports: source is a first-class filter, not inferred from
  // whether a customer has a registered account.
  const [serviceFilters, setServiceFilters] = useState(emptyServiceFilters);
  const [servicePage, setServicePage] = useState(0);
  const [servicePageSize, setServicePageSize] = useState(PAGE_SIZE_DEFAULT);
  const [serviceSortKey, setServiceSortKey] = useState<string | null>(null);
  const [serviceSortDir, setServiceSortDir] = useState<SortDirection>(null);
  const [selectedService, setSelectedService] = useState<ServiceReport | null>(null);

  const filteredService = useMemo(() => {
    const q = serviceFilters.search.trim().toLowerCase();
    const matched = serviceReports.filter((r) => {
      const matchesSearch = !q ||
        [r.id, r.pet, r.owner, r.service, r.appointmentId].some((v) => v.toLowerCase().includes(q));
      const matchesType = serviceFilters.reportType === "All Types" || r.category === serviceFilters.reportType;
      const matchesSource = serviceFilters.source === "all" || r.source === serviceFilters.source;
      const matchesStatus = serviceFilters.status === "all" || r.status === serviceFilters.status;
      const matchesFrom = !serviceFilters.fromDate || r.date >= serviceFilters.fromDate;
      const matchesTo = !serviceFilters.toDate || r.date <= serviceFilters.toDate;
      return matchesSearch && matchesType && matchesSource && matchesStatus && matchesFrom && matchesTo;
    });
    return sortRows(matched, serviceSortKey, serviceSortDir);
  }, [serviceFilters, serviceSortKey, serviceSortDir, serviceReports]);

  // Inventory Reports: preserve original filters, sorting, and pagination.
  const [inventoryFilters, setInventoryFilters] = useState(emptyInventoryFilters);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryPageSize, setInventoryPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [inventorySortKey, setInventorySortKey] = useState<string | null>(null);
  const [inventorySortDir, setInventorySortDir] = useState<SortDirection>(null);

  const filteredInventory = useMemo(() => {
    const q = inventoryFilters.search.trim().toLowerCase();
    const matched = inventoryReports.filter((r) => {
      const matchesSearch = !q || r.itemName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchesCategory = inventoryFilters.category === "All Categories" || r.category === inventoryFilters.category;
      const matchesStatus = inventoryFilters.status === "all" || r.status === inventoryFilters.status;
      const matchesUnit = inventoryFilters.unit === "All Units" || r.unit === inventoryFilters.unit;
      const matchesExpiration = inventoryFilters.expiration === "all" ||
        (inventoryFilters.expiration === "no_expiration" && !r.expirationDate) ||
        (inventoryFilters.expiration === "expiring_soon" && !!r.expirationDate &&
          (new Date(r.expirationDate).getTime() - nowMs) / 86400000 <= 30);
      return matchesSearch && matchesCategory && matchesStatus && matchesUnit && matchesExpiration;
    });
    return sortRows(matched, inventorySortKey, inventorySortDir);
  }, [inventoryFilters, inventorySortKey, inventorySortDir, inventoryReports, nowMs]);

  // Sales Reports: one row per invoice. Category search matches any
  // item, but still shows the FULL invoice total/cash/change once.
  const [salesFilters, setSalesFilters] = useState(emptySalesFilters);
  const [salesPage, setSalesPage] = useState(0);
  const [salesPageSize, setSalesPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [salesSortKey, setSalesSortKey] = useState<string | null>(null);
  const [salesSortDir, setSalesSortDir] = useState<SortDirection>(null);

  const filteredSales = useMemo(() => {
    const q = salesFilters.search.trim().toLowerCase();
    const matched = salesReports.filter((r) => {
      const matchesSearch = !q || r.itemName.toLowerCase().includes(q) || r.invoiceNumber.toLowerCase().includes(q);
      const matchesCategory = salesFilters.category === "All Categories" || r.items.some((i) => i.category === salesFilters.category);
      const matchesFrom = !salesFilters.fromDate || r.date >= salesFilters.fromDate;
      const matchesTo = !salesFilters.toDate || r.date <= salesFilters.toDate;
      return matchesSearch && matchesCategory && matchesFrom && matchesTo;
    });
    return sortRows(matched, salesSortKey, salesSortDir);
  }, [salesFilters, salesSortKey, salesSortDir, salesReports]);

  return (
    <div className={`${inter.className} -m-6 md:-m-8 p-6 md:p-8 min-h-full bg-[#F8F9FC]`}>
      <ReportsHeader />
      <div className="mt-6"><ReportTabs active={tab} onChange={setTab} /></div>

      {reportsError && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Couldn&apos;t load report data: {reportsError}
        </div>
      )}
      {reportsLoading && <p className="mt-5 text-sm text-zinc-400">Loading real report data…</p>}

      {tab === "service" && (
        <>
          <div className="mt-5"><FilterToolbar filters={serviceFilters} onApply={(f) => { setServiceFilters(f); setServicePage(0); }} onReset={() => { setServiceFilters(emptyServiceFilters); setServicePage(0); }} rows={filteredService} /></div>
          <div className="mt-5"><ReportStats reports={filteredService} /></div>
          <div className="mt-5"><ReportTable rows={filteredService.slice(servicePage * servicePageSize, servicePage * servicePageSize + servicePageSize)} onView={setSelectedService} sortKey={serviceSortKey} sortDirection={serviceSortDir} onSort={(key) => { const n = nextSortState(serviceSortKey, serviceSortDir, key); setServiceSortKey(n.key); setServiceSortDir(n.direction); }} /></div>
          <div className="mt-5"><ReportFooter page={servicePage} pageSize={servicePageSize} totalItems={filteredService.length} onPageChange={setServicePage} onPageSizeChange={(s) => { setServicePageSize(s); setServicePage(0); }} /></div>
        </>
      )}

      {tab === "inventory" && (
        <>
          <div className="mt-5"><InventoryFilterToolbar filters={inventoryFilters} onApply={(f) => { setInventoryFilters(f); setInventoryPage(0); }} onReset={() => { setInventoryFilters(emptyInventoryFilters); setInventoryPage(0); }} rows={filteredInventory} /></div>
          <div className="mt-5"><InventoryReportTable rows={filteredInventory.slice(inventoryPage * inventoryPageSize, inventoryPage * inventoryPageSize + inventoryPageSize)} sortKey={inventorySortKey} sortDirection={inventorySortDir} onSort={(key) => { const n = nextSortState(inventorySortKey, inventorySortDir, key); setInventorySortKey(n.key); setInventorySortDir(n.direction); }} /></div>
          <div className="mt-5"><ReportFooter page={inventoryPage} pageSize={inventoryPageSize} totalItems={filteredInventory.length} onPageChange={setInventoryPage} onPageSizeChange={(s) => { setInventoryPageSize(s); setInventoryPage(0); }} /></div>
        </>
      )}

      {tab === "sales" && (
        <>
          <div className="mt-5"><SalesFilterToolbar filters={salesFilters} onApply={(f) => { setSalesFilters(f); setSalesPage(0); }} onReset={() => { setSalesFilters(emptySalesFilters); setSalesPage(0); }} rows={filteredSales} /></div>
          <div className="mt-5"><SalesReportTable rows={filteredSales.slice(salesPage * salesPageSize, salesPage * salesPageSize + salesPageSize)} sortKey={salesSortKey} sortDirection={salesSortDir} onSort={(key) => { const n = nextSortState(salesSortKey, salesSortDir, key); setSalesSortKey(n.key); setSalesSortDir(n.direction); }} /></div>
          <div className="mt-5"><ReportFooter page={salesPage} pageSize={salesPageSize} totalItems={filteredSales.length} onPageChange={setSalesPage} onPageSizeChange={(s) => { setSalesPageSize(s); setSalesPage(0); }} /></div>
        </>
      )}
      {selectedService && <ReportDetailModal report={selectedService} onClose={() => setSelectedService(null)} />}
    </div>
  );
}
