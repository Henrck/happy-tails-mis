"use client";
// Report Management — all 4 tabs now built. Each tab has independent
// filter/sort/pagination state so switching tabs doesn't lose your place
// in another one. Sorting works by clicking any column header (asc ->
// desc -> off). Export menu is UI-only for now — see note at the bottom
// of this file.
import { useState, useMemo } from "react";
import { Inter } from "next/font/google";
import { sortRows, nextSortState, type SortDirection } from "@/lib/utils/sort";

import { serviceReports, type ServiceReport } from "@/lib/data/service-reports-mock";
import { inventoryReports } from "@/lib/data/inventory-reports-mock";
import { transactionReports } from "@/lib/data/transaction-reports-mock";
import { salesReports } from "@/lib/data/sales-reports-mock";

import ReportsHeader from "@/components/admin/reports/ReportsHeader";
import ReportTabs, { type ReportTab } from "@/components/admin/reports/ReportTabs";
import ReportStats from "@/components/admin/reports/ReportStats";
import ReportFooter from "@/components/admin/reports/ReportFooter";
import ReportDetailModal from "@/components/admin/reports/ReportDetailModal";

import FilterToolbar, { type FilterState } from "@/components/admin/reports/FilterToolbar";
import ReportTable from "@/components/admin/reports/ReportTable";

import InventoryFilterToolbar, { type InventoryFilterState } from "@/components/admin/reports/InventoryFilterToolbar";
import InventoryReportTable from "@/components/admin/reports/InventoryReportTable";

import TransactionFilterToolbar, { type TransactionFilterState } from "@/components/admin/reports/TransactionFilterToolbar";
import TransactionReportTable from "@/components/admin/reports/TransactionReportTable";

import SalesFilterToolbar, { type SalesFilterState } from "@/components/admin/reports/SalesFilterToolbar";
import SalesReportTable from "@/components/admin/reports/SalesReportTable";

const inter = Inter({ subsets: ["latin"] });

const emptyServiceFilters: FilterState = { search: "", reportType: "All Types", fromDate: "", toDate: "", status: "all" };
const emptyInventoryFilters: InventoryFilterState = { search: "", category: "All Categories", expiration: "all", status: "all", unit: "All Units" };
const emptyTransactionFilters: TransactionFilterState = { search: "", fromDate: "", toDate: "", status: "all", serviceType: "All Types" };
const emptySalesFilters: SalesFilterState = { search: "", fromDate: "", toDate: "", category: "All Categories" };

const PAGE_SIZE_DEFAULT = 10;

export default function ReportManagementPage() {
  const [tab, setTab] = useState<ReportTab>("service");

  // --- Service Reports state ---
  const [serviceFilters, setServiceFilters] = useState(emptyServiceFilters);
  const [servicePage, setServicePage] = useState(0);
  const [servicePageSize, setServicePageSize] = useState(PAGE_SIZE_DEFAULT);
  const [serviceSortKey, setServiceSortKey] = useState<string | null>(null);
  const [serviceSortDir, setServiceSortDir] = useState<SortDirection>(null);
  const [selectedService, setSelectedService] = useState<ServiceReport | null>(null);

  const filteredService = useMemo(() => {
    const q = serviceFilters.search.trim().toLowerCase();
    const matched = serviceReports.filter((r) => {
      const matchesSearch = !q || r.pet.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchesType = serviceFilters.reportType === "All Types" || r.service.toLowerCase().includes(serviceFilters.reportType.toLowerCase());
      const matchesStatus = serviceFilters.status === "all" || r.status === serviceFilters.status;
      const matchesFrom = !serviceFilters.fromDate || r.date >= serviceFilters.fromDate;
      const matchesTo = !serviceFilters.toDate || r.date <= serviceFilters.toDate;
      return matchesSearch && matchesType && matchesStatus && matchesFrom && matchesTo;
    });
    return sortRows(matched, serviceSortKey, serviceSortDir);
  }, [serviceFilters, serviceSortKey, serviceSortDir]);

  // --- Inventory Reports state ---
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
      const matchesExpiration =
        inventoryFilters.expiration === "all" ||
        (inventoryFilters.expiration === "no_expiration" && !r.expirationDate) ||
        (inventoryFilters.expiration === "expiring_soon" &&
          !!r.expirationDate &&
          (new Date(r.expirationDate).getTime() - Date.now()) / 86400000 <= 30);
      return matchesSearch && matchesCategory && matchesStatus && matchesUnit && matchesExpiration;
    });
    return sortRows(matched, inventorySortKey, inventorySortDir);
  }, [inventoryFilters, inventorySortKey, inventorySortDir]);

  // --- Transaction Reports state ---
  const [transactionFilters, setTransactionFilters] = useState(emptyTransactionFilters);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionPageSize, setTransactionPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [transactionSortKey, setTransactionSortKey] = useState<string | null>(null);
  const [transactionSortDir, setTransactionSortDir] = useState<SortDirection>(null);

  const filteredTransactions = useMemo(() => {
    const q = transactionFilters.search.trim().toLowerCase();
    const matched = transactionReports.filter((r) => {
      const matchesSearch = !q || r.petName.toLowerCase().includes(q) || r.ownerName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      const matchesStatus = transactionFilters.status === "all" || r.status === transactionFilters.status;
      const matchesType = transactionFilters.serviceType === "All Types" || r.service.toLowerCase().includes(transactionFilters.serviceType.toLowerCase());
      const matchesFrom = !transactionFilters.fromDate || r.date >= transactionFilters.fromDate;
      const matchesTo = !transactionFilters.toDate || r.date <= transactionFilters.toDate;
      return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo;
    });
    return sortRows(matched, transactionSortKey, transactionSortDir);
  }, [transactionFilters, transactionSortKey, transactionSortDir]);

  // --- Sales Reports state ---
  const [salesFilters, setSalesFilters] = useState(emptySalesFilters);
  const [salesPage, setSalesPage] = useState(0);
  const [salesPageSize, setSalesPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [salesSortKey, setSalesSortKey] = useState<string | null>(null);
  const [salesSortDir, setSalesSortDir] = useState<SortDirection>(null);

  const filteredSales = useMemo(() => {
    const q = salesFilters.search.trim().toLowerCase();
    const matched = salesReports
      .filter((r) => {
        const matchesSearch = !q || r.itemName.toLowerCase().includes(q) || r.invoiceNumber.toLowerCase().includes(q);
        const matchesCategory = salesFilters.category === "All Categories" || r.category === salesFilters.category;
        const matchesFrom = !salesFilters.fromDate || r.date >= salesFilters.fromDate;
        const matchesTo = !salesFilters.toDate || r.date <= salesFilters.toDate;
        return matchesSearch && matchesCategory && matchesFrom && matchesTo;
      })
      // totalPrice is derived, not stored — computing it here (rather than
      // inside SalesReportTable) is what lets the shared sortRows() utility
      // sort by it like any other field.
      .map((r) => ({ ...r, totalPrice: r.quantity * r.unitPrice }));
    return sortRows(matched, salesSortKey, salesSortDir);
  }, [salesFilters, salesSortKey, salesSortDir]);

  return (
    <div className={`${inter.className} -m-6 md:-m-8 p-6 md:p-8 min-h-full bg-[#F8F9FC]`}>
      <ReportsHeader />
      <div className="mt-6"><ReportTabs active={tab} onChange={setTab} /></div>

      {tab === "service" && (
        <>
          <div className="mt-5"><FilterToolbar filters={serviceFilters} onApply={(f) => { setServiceFilters(f); setServicePage(0); }} onReset={() => { setServiceFilters(emptyServiceFilters); setServicePage(0); }} /></div>
          <div className="mt-5"><ReportStats reports={filteredService} /></div>
          <div className="mt-5">
            <ReportTable
              rows={filteredService.slice(servicePage * servicePageSize, servicePage * servicePageSize + servicePageSize)}
              onView={setSelectedService}
              sortKey={serviceSortKey}
              sortDirection={serviceSortDir}
              onSort={(key) => { const n = nextSortState(serviceSortKey, serviceSortDir, key); setServiceSortKey(n.key); setServiceSortDir(n.direction); }}
            />
          </div>
          <div className="mt-5"><ReportFooter page={servicePage} pageSize={servicePageSize} totalItems={filteredService.length} onPageChange={setServicePage} onPageSizeChange={(s) => { setServicePageSize(s); setServicePage(0); }} /></div>
        </>
      )}

      {tab === "inventory" && (
        <>
          <div className="mt-5"><InventoryFilterToolbar filters={inventoryFilters} onApply={(f) => { setInventoryFilters(f); setInventoryPage(0); }} onReset={() => { setInventoryFilters(emptyInventoryFilters); setInventoryPage(0); }} /></div>
          <div className="mt-5">
            <InventoryReportTable
              rows={filteredInventory.slice(inventoryPage * inventoryPageSize, inventoryPage * inventoryPageSize + inventoryPageSize)}
              sortKey={inventorySortKey}
              sortDirection={inventorySortDir}
              onSort={(key) => { const n = nextSortState(inventorySortKey, inventorySortDir, key); setInventorySortKey(n.key); setInventorySortDir(n.direction); }}
            />
          </div>
          <div className="mt-5"><ReportFooter page={inventoryPage} pageSize={inventoryPageSize} totalItems={filteredInventory.length} onPageChange={setInventoryPage} onPageSizeChange={(s) => { setInventoryPageSize(s); setInventoryPage(0); }} /></div>
        </>
      )}

      {tab === "transaction" && (
        <>
          <div className="mt-5"><TransactionFilterToolbar filters={transactionFilters} onApply={(f) => { setTransactionFilters(f); setTransactionPage(0); }} onReset={() => { setTransactionFilters(emptyTransactionFilters); setTransactionPage(0); }} /></div>
          <div className="mt-5">
            <TransactionReportTable
              rows={filteredTransactions.slice(transactionPage * transactionPageSize, transactionPage * transactionPageSize + transactionPageSize)}
              sortKey={transactionSortKey}
              sortDirection={transactionSortDir}
              onSort={(key) => { const n = nextSortState(transactionSortKey, transactionSortDir, key); setTransactionSortKey(n.key); setTransactionSortDir(n.direction); }}
            />
          </div>
          <div className="mt-5"><ReportFooter page={transactionPage} pageSize={transactionPageSize} totalItems={filteredTransactions.length} onPageChange={setTransactionPage} onPageSizeChange={(s) => { setTransactionPageSize(s); setTransactionPage(0); }} /></div>
        </>
      )}

      {tab === "sales" && (
        <>
          <div className="mt-5"><SalesFilterToolbar filters={salesFilters} onApply={(f) => { setSalesFilters(f); setSalesPage(0); }} onReset={() => { setSalesFilters(emptySalesFilters); setSalesPage(0); }} /></div>
          <div className="mt-5">
            <SalesReportTable
              rows={filteredSales.slice(salesPage * salesPageSize, salesPage * salesPageSize + salesPageSize)}
              sortKey={salesSortKey}
              sortDirection={salesSortDir}
              onSort={(key) => { const n = nextSortState(salesSortKey, salesSortDir, key); setSalesSortKey(n.key); setSalesSortDir(n.direction); }}
            />
          </div>
          <div className="mt-5"><ReportFooter page={salesPage} pageSize={salesPageSize} totalItems={filteredSales.length} onPageChange={setSalesPage} onPageSizeChange={(s) => { setSalesPageSize(s); setSalesPage(0); }} /></div>
        </>
      )}

      {selectedService && <ReportDetailModal report={selectedService} onClose={() => setSelectedService(null)} />}
    </div>
  );
}

// NOTE on "fetch all data from the database later" (Josh's instruction):
// every filter/sort/pagination path above operates on the same in-memory
// mock arrays used elsewhere in the project (service-reports-mock.ts,
// inventory-reports-mock.ts, transaction-reports-mock.ts,
// sales-reports-mock.ts). When real tables exist, each of the 4
// `filtered*` useMemo blocks becomes a Supabase query instead — the
// filter/sort/pagination UI and state management above don't need to
// change shape, just what feeds them.
