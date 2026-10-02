"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import {
  Download,
  PackageCheck,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Package,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { DocumentMetadata } from "@/lib/types";
import { useDataChanged } from "@/lib/data-events";
import { normalizeIssueDate } from "@/lib/lot";
import { toast } from "sonner";

function formatLot(doc: DocumentMetadata) {
  if (doc.lotEnd && doc.lotEnd !== doc.lotStart)
    return `${doc.lotStart} ~ ${doc.lotEnd}`;
  return doc.lotStart || "-";
}

function formatQuantity(quantity: number | null | undefined, unit?: string) {
  if (quantity == null || Number.isNaN(Number(quantity))) return "-";
  return `${Number(quantity).toLocaleString()} ${unit || "Kg"}`;
}

function getIssueDateSortValue(value?: string) {
  try {
    const normalized = normalizeIssueDate(value);
    return normalized ? normalized.replace(/-/g, "") : "00000000";
  } catch {
    return "00000000";
  }
}

function formatDate(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";

  const compactMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  const normalized = raw.replace(/[/.]/g, "-");
  const match =
    compactMatch ?? normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return raw;

  const [, year, month, day] = compactMatch ? compactMatch : match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValidDate =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day);

  return isValidDate
    ? `${year}.${month.padStart(2, "0")}.${day.padStart(2, "0")}`
    : "-";
}

export function ShipmentView() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sortKey, setSortKey] = useState<
    | "company"
    | "floor"
    | "shipmentCategory"
    | "product"
    | "lot"
    | "issueDate"
    | "quantity"
  >("issueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [floorFilter, setFloorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [movementFilter, setMovementFilter] = useState<"all" | "입고" | "출고">(
    "all",
  );
  const [companyFilter, setCompanyFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [query, setQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    issueDate: new Date().toISOString().slice(0, 10),
    company: "",
    product: "",
    floor: "1",
    quantity: "",
    quantityUnit: "EA",
    lotStart: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalAvailableCompanies = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .filter(
              (doc) => !addForm.product || doc.product === addForm.product,
            )
            .map((doc) => doc.company)
            .filter(Boolean),
        ),
      ).sort(),
    [documents, addForm.product],
  );

  const modalAvailableProducts = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .filter(
              (doc) => !addForm.company || doc.company === addForm.company,
            )
            .map((doc) => doc.product)
            .filter(Boolean),
        ),
      ).sort(),
    [documents, addForm.company],
  );

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.company || !addForm.product || !addForm.quantity) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        documentType: "명세표",
        movementType: "입고",
        issueDate: addForm.issueDate.replace(/-/g, "."),
        company: addForm.company,
        product: addForm.product,
        floor: Number(addForm.floor),
        quantity: Number(addForm.quantity),
        quantityUnit: addForm.quantityUnit,
        lotStart: addForm.lotStart,
      };

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("등록 실패");

      toast.success("입고 내역이 등록되었습니다.");
      setIsAddModalOpen(false);
      setAddForm({
        ...addForm,
        company: "",
        product: "",
        quantity: "",
        lotStart: "",
      });
      loadDocuments(true);
    } catch (error) {
      toast.error("입고 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCompanies = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .filter(
              (doc) =>
                (productFilter === "all" || doc.product === productFilter) &&
                (floorFilter === "all" ||
                  String(doc.floor ?? doc.shipmentFloor ?? "") === floorFilter),
            )
            .map((doc) => doc.company)
            .filter(Boolean),
        ),
      ),
    [documents, productFilter, floorFilter],
  );

  const availableProducts = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .filter(
              (doc) =>
                (companyFilter === "all" || doc.company === companyFilter) &&
                (floorFilter === "all" ||
                  String(doc.floor ?? doc.shipmentFloor ?? "") === floorFilter),
            )
            .map((doc) => doc.product)
            .filter(Boolean),
        ),
      ),
    [documents, companyFilter, floorFilter],
  );

  const availableFloors = useMemo(
    () =>
      Array.from(
        new Set(
          documents
            .filter(
              (doc) =>
                (companyFilter === "all" || doc.company === companyFilter) &&
                (productFilter === "all" || doc.product === productFilter),
            )
            .map((doc) => String(doc.floor ?? doc.shipmentFloor ?? ""))
            .filter(Boolean),
        ),
      ).sort(),
    [documents, companyFilter, productFilter],
  );

  const activeCompany =
    companyFilter === "all" && availableCompanies.length === 1
      ? availableCompanies[0]
      : companyFilter;
  const activeProduct =
    productFilter === "all" && availableProducts.length === 1
      ? availableProducts[0]
      : productFilter;
  const activeFloor =
    floorFilter === "all" && availableFloors.length === 1
      ? availableFloors[0]
      : floorFilter;

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return documents.filter((doc) => {
      const floor = String(doc.floor ?? doc.shipmentFloor ?? "");
      const category = doc.shipmentCategory || "미분류";
      const movement = doc.movementType || "출고";
      const searchableText = [
        doc.company,
        doc.product,
        formatLot(doc),
        doc.issueDate,
        category,
        floor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ko-KR");
      const issueDate = getIssueDateSortValue(doc.issueDate);
      return (
        (floorFilter === "all" || floor === floorFilter) &&
        (categoryFilter === "all" || category === categoryFilter) &&
        (movementFilter === "all" || movement === movementFilter) &&
        (companyFilter === "all" || doc.company === companyFilter) &&
        (productFilter === "all" || doc.product === productFilter) &&
        (!startDate || issueDate >= startDate.replace(/-/g, "")) &&
        (!endDate || issueDate <= endDate.replace(/-/g, "")) &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [
    categoryFilter,
    documents,
    floorFilter,
    movementFilter,
    query,
    companyFilter,
    productFilter,
    startDate,
    endDate,
  ]);

  const sortedDocuments = useMemo(() => {
    return [...filteredDocuments].sort((a, b) => {
      const values = {
        company: [a.company || "", b.company || ""],
        floor: [
          a.floor ?? a.shipmentFloor ?? 0,
          b.floor ?? b.shipmentFloor ?? 0,
        ],
        shipmentCategory: [
          a.shipmentCategory || "미분류",
          b.shipmentCategory || "미분류",
        ],
        product: [a.product || "", b.product || ""],
        lot: [formatLot(a), formatLot(b)],
        issueDate: [
          getIssueDateSortValue(a.issueDate),
          getIssueDateSortValue(b.issueDate),
        ],
        quantity: [a.quantity ?? -Infinity, b.quantity ?? -Infinity],
      }[sortKey];
      const left = values[0];
      const right = values[1];
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "ko");
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredDocuments, sortDirection, sortKey]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key)
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const loadDocuments = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/documents", { cache: "no-store" });
      if (!response.ok) throw new Error("문서 목록을 불러오지 못했습니다.");
      const result = await response.json();
      const shipmentDocuments = (result.data || []).filter(
        (doc: DocumentMetadata) => doc.documentType === "성적서",
      );
      setDocuments(shipmentDocuments);
    } catch {
      toast.error("문서 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  useDataChanged(() => loadDocuments(true), [loadDocuments]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("입출고 관리");
      sheet.columns = [
        { header: "순번", key: "number", width: 8 },
        { header: "업체명", key: "company", width: 24 },
        { header: "층", key: "floor", width: 10 },
        { header: "구분", key: "category", width: 14 },
        { header: "품목", key: "product", width: 24 },
        { header: "로트번호", key: "lot", width: 28 },
        { header: "발행일", key: "issueDate", width: 16 },
        { header: "수량", key: "quantity", width: 14 },
      ];
      sheet.addRows(
        sortedDocuments.map((doc, index) => ({
          number: index + 1,
          company: doc.company || "-",
          floor:
            (doc.floor ?? doc.shipmentFloor)
              ? `${doc.floor ?? doc.shipmentFloor}층`
              : "-",
          category: doc.shipmentCategory || "미분류",
          product: doc.product || "-",
          lot: formatLot(doc),
          issueDate: formatDate(doc.issueDate),
          quantity:
            doc.quantity != null
              ? `${doc.quantity.toLocaleString()} ${doc.quantityUnit || "Kg"}`
              : "-",
        })),
      );
      const border = {
        top: { style: "thin" as const, color: { argb: "FFB8C2D1" } },
        left: { style: "thin" as const, color: { argb: "FFB8C2D1" } },
        bottom: { style: "thin" as const, color: { argb: "FFB8C2D1" } },
        right: { style: "thin" as const, color: { argb: "FFB8C2D1" } },
      };
      sheet.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 28 : 24;
        row.eachCell((cell, columnNumber) => {
          cell.border = border;
          cell.font = { name: "맑은 고딕", size: rowNumber === 1 ? 11 : 10 };
          cell.alignment = {
            vertical: "middle",
            horizontal: [1, 6, 7].includes(columnNumber) ? "center" : "left",
            wrapText: true,
          };
          if (rowNumber > 1 && rowNumber % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF3F6FA" },
            };
          }
        });
      });
      const header = sheet.getRow(1);
      header.font = {
        name: "맑은 고딕",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      header.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      header.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      sheet.getColumn("quantity").numFmt = "#,##0.##";
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: "H1" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `입출고관리_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("엑셀 파일을 다운로드했습니다.");
    } catch {
      toast.error("엑셀 파일 생성에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="p-6 md:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">입/출고 관리</h1>
            <p className="text-sm text-muted-foreground">
              등록된 성적서의 입고·출고 정보를 한 곳에서 확인하고 엑셀로
              저장합니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" /> 입고 등록
          </Button>
          <Button
            variant="outline"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />{" "}
            새로고침
          </Button>
          <Button
            onClick={downloadExcel}
            disabled={loading || downloading || documents.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> 엑셀 다운로드
          </Button>
        </div>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">출하 목록 검색</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="업체명, 품명, 로트번호 검색..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="검색어 지우기"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="space-y-1.5 text-sm font-medium">
            <span>업체명</span>
            <select
              value={activeCompany}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">전체 업체</option>
              {availableCompanies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>품명</span>
            <select
              value={activeProduct}
              onChange={(event) => setProductFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">전체 품목</option>
              {availableProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>층</span>
            <select
              value={activeFloor}
              onChange={(event) => setFloorFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">전체 층</option>
              {availableFloors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}층
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium lg:col-span-2">
            <span>날짜 범위</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <span className="text-muted-foreground">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
              />
            </div>
          </label>
          <div className="flex items-end justify-end text-right text-sm text-muted-foreground">
            필터 결과{" "}
            <strong className="ml-1 text-foreground">
              {filteredDocuments.length}건
            </strong>
          </div>
        </div>
      </section>

      {movementFilter === "all" ? (
        <ProductionView
          documents={filteredDocuments}
          loading={loading}
          isEmbedded={true}
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">입/출고 목록</h2>
            <span className="text-sm text-muted-foreground">
              총 {documents.length}건
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  {(
                    [
                      ["company", "업체명"],
                      ["floor", "층"],
                      ["shipmentCategory", "구분"],
                      ["product", "품목"],
                      ["lot", "로트번호"],
                      ["issueDate", "발행일"],
                      ["quantity", "수량"],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="inline-flex items-center gap-1 rounded px-1 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${label} ${sortKey === key ? (sortDirection === "asc" ? "오름차순" : "내림차순") : "정렬"}`}
                      >
                        {label}
                        <span aria-hidden="true" className="text-[10px]">
                          {sortKey === key
                            ? sortDirection === "asc"
                              ? "▲"
                              : "▼"
                            : "↕"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 6 }).map((__, cell) => (
                        <td key={cell} className="px-5 py-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sortedDocuments.length > 0 ? (
                  sortedDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4 font-medium">
                        {doc.company || "-"}
                      </td>
                      <td className="px-5 py-4">
                        {(doc.floor ?? doc.shipmentFloor)
                          ? `${doc.floor ?? doc.shipmentFloor}층`
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        {doc.shipmentCategory || "미분류"}
                      </td>
                      <td className="px-5 py-4">{doc.product || "-"}</td>
                      <td className="px-5 py-4">{formatLot(doc)}</td>
                      <td className="px-5 py-4">{formatDate(doc.issueDate)}</td>
                      <td className="px-5 py-4">
                        {formatQuantity(doc.quantity, doc.quantityUnit)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-muted-foreground"
                    >
                      등록된 성적서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>입고 내역 등록</DialogTitle>
            <DialogDescription>
              거래명세표 등을 참고하여 입고 내역을 수기로 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">입고일자</label>
              <Input
                type="date"
                value={addForm.issueDate}
                onChange={(e) =>
                  setAddForm({ ...addForm, issueDate: e.target.value })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">업체명</label>
              <SearchableCombobox
                configName="companies"
                options={modalAvailableCompanies}
                recentOptions={modalAvailableCompanies}
                value={addForm.company}
                onChange={(val) => {
                  let nextProduct = addForm.product;
                  if (val && !addForm.product) {
                    const prods = Array.from(
                      new Set(
                        documents
                          .filter((d) => d.company === val)
                          .map((d) => d.product)
                          .filter(Boolean),
                      ),
                    );
                    if (prods.length === 1) nextProduct = prods[0];
                  }
                  setAddForm({
                    ...addForm,
                    company: val,
                    product: nextProduct,
                  });
                }}
                placeholder="업체 검색 또는 입력..."
                className="col-span-3 h-10"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">품명</label>
              <SearchableCombobox
                configName="products"
                options={modalAvailableProducts}
                recentOptions={modalAvailableProducts}
                value={addForm.product}
                onChange={(val) => {
                  let nextCompany = addForm.company;
                  if (val && !addForm.company) {
                    const comps = Array.from(
                      new Set(
                        documents
                          .filter((d) => d.product === val)
                          .map((d) => d.company)
                          .filter(Boolean),
                      ),
                    );
                    if (comps.length === 1) nextCompany = comps[0];
                  }
                  setAddForm({
                    ...addForm,
                    product: val,
                    company: nextCompany,
                  });
                }}
                placeholder="품명 검색 또는 입력..."
                className="col-span-3 h-10"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">층</label>
              <select
                value={addForm.floor}
                onChange={(e) =>
                  setAddForm({ ...addForm, floor: e.target.value })
                }
                className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="1">1층</option>
                <option value="2">2층</option>
                <option value="3">3층</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">로트번호</label>
              <Input
                placeholder="(선택 사항)"
                value={addForm.lotStart}
                onChange={(e) =>
                  setAddForm({ ...addForm, lotStart: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">수량</label>
              <div className="col-span-3 flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={addForm.quantity}
                  onChange={(e) =>
                    setAddForm({ ...addForm, quantity: e.target.value })
                  }
                  className="flex-1"
                  required
                />
                <select
                  value={addForm.quantityUnit}
                  onChange={(e) =>
                    setAddForm({ ...addForm, quantityUnit: e.target.value })
                  }
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EA">EA</option>
                  <option value="Kg">Kg</option>
                  <option value="R">R</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "등록하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function formatProductionDate(value?: string) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[/.]/g, "-");
  const match = raw.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw || "-";
}

function dateKey(value?: string) {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function number(value: number) {
  return value === 0
    ? "—"
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

type ProductionViewProps = {
  documents?: DocumentMetadata[];
  loading?: boolean;
  isEmbedded?: boolean;
};

function ProductionView({
  documents = [],
  loading = false,
  isEmbedded = false,
}: ProductionViewProps) {
  const [visibleCount, setVisibleCount] = useState(20);

  const unit = useMemo(() => {
    const units = documents
      .map((doc) => doc.quantityUnit?.trim())
      .filter((item): item is string => Boolean(item));
    return units.length ? Array.from(new Set(units)).join(" / ") : "단위 미정";
  }, [documents]);

  const rows = useMemo(() => {
    const filtered = documents;
    const grouped = new Map<string, number>();
    filtered.forEach((doc) =>
      grouped.set(
        dateKey(doc.issueDate),
        (grouped.get(dateKey(doc.issueDate)) ?? 0) + Number(doc.quantity ?? 0),
      ),
    );
    let inventory = 0;
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, outgoing]) => {
        const incoming = 0;
        const defect = 0;
        const difference = incoming - outgoing - defect;
        inventory += difference;
        return {
          key,
          date: formatProductionDate(key),
          incoming,
          outgoing,
          defect,
          difference,
          inventory,
        };
      });
  }, [documents]);

  useEffect(() => {
    setVisibleCount(20);
  }, [documents]);

  const visibleRows = rows.slice(0, visibleCount);

  const summary = [
    {
      label: "입고 합계",
      value: rows.reduce((sum, row) => sum + row.incoming, 0),
      tone: "blue",
    },
    {
      label: "출고 합계",
      value: rows.reduce((sum, row) => sum + row.outgoing, 0),
      tone: "orange",
    },
    {
      label: "불량 합계",
      value: rows.reduce((sum, row) => sum + row.defect, 0),
      tone: "rose",
    },
    { label: "현재 재고", value: rows.at(-1)?.inventory ?? 0, tone: "yellow" },
  ];

  const content = (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <span className="text-xs font-semibold text-muted-foreground">
              {item.label}
            </span>
            <p className="mt-2 text-xl font-bold tabular-nums">
              {number(item.value)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">전체 업체 · 전체 품목</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            출고 수량은 등록된 성적서의 수량을 합산합니다.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 text-xs text-muted-foreground">
                <th className="sticky left-0 z-10 border-b border-r bg-muted/90 px-4 py-3 text-left">
                  날짜
                </th>
                {["입고", "출고", "불량", "차이수량", "재고"].map((head) => (
                  <th key={head} className="border-b px-4 py-3 text-right">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-muted-foreground"
                  >
                    데이터를 불러오는 중입니다.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="sticky left-0 z-10 border-r bg-card px-4 py-3 font-medium">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {number(row.incoming)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-orange-600">
                      {number(row.outgoing)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {number(row.defect)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${row.difference < 0 ? "text-rose-600" : ""}`}
                    >
                      {number(row.difference)}
                    </td>
                    <td className="bg-yellow-50/70 px-4 py-3 text-right font-bold tabular-nums dark:bg-yellow-950/20">
                      {number(row.inventory)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <TriangleAlert className="h-4 w-4" /> 등록된 데이터가 없습니다.
            </div>
          )}
          {!loading && rows.length > visibleCount && (
            <div className="flex justify-center border-t p-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setVisibleCount(rows.length)}
              >
                <ChevronDown className="h-4 w-4" /> 더보기 (
                {rows.length - visibleCount}개)
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" /> 차이수량 = 입고 − 출고 − 불량 ·
          재고 = 누적 차이수량 · 단위: {unit}
        </div>
      </section>
    </>
  );

  if (isEmbedded) {
    return <div className="space-y-5">{content}</div>;
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">{content}</div>
    </main>
  );
}

export default ShipmentView;
