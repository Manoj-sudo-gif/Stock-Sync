import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  Store,
  Barcode,
  Layers,
} from 'lucide-react';
import { ColumnMapping, ComparisonItem, TabKey, UploadedFile } from '../types';
import { exportChangedStockReport } from '../utils/excel';

interface ComparisonTableProps {
  items: ComparisonItem[];
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  onCopyNotice: (msg: string) => void;
  onUpdateTargetQty?: (itemId: string, newQty: number) => void;
  ecommerceFile?: UploadedFile | null;
  columnMapping?: ColumnMapping;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  items,
  onCopyNotice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<
    | 'mainCategory'
    | 'productType'
    | 'name'
    | 'sku'
    | 'toonLabel'
    | 'wondersoftQty'
    | 'ecommerceQty'
    | 'difference'
  >('difference');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Distinct store list for quick store filtering
  const availableStores = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.storeName) set.add(item.storeName);
    }
    return Array.from(set).sort();
  }, [items]);

  // Filter items based on search and store filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Store filter
      if (selectedStoreFilter !== 'all') {
        if (item.storeName.toLowerCase() !== selectedStoreFilter.toLowerCase()) return false;
      }

      // Search filter (Item Name, EAN, Main Category, Product Type, Store, or Style No)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const eanMatch = (item.ean || item.sku).toLowerCase().includes(query);
        const nameMatch = item.name.toLowerCase().includes(query);
        const categoryMatch = item.mainCategory ? item.mainCategory.toLowerCase().includes(query) : false;
        const typeMatch = item.productType ? item.productType.toLowerCase().includes(query) : false;
        const toonMatch = item.toonLabel ? item.toonLabel.toLowerCase().includes(query) : false;
        const storeMatch = item.storeName.toLowerCase().includes(query);
        const styleMatch = item.styleNo ? item.styleNo.toLowerCase().includes(query) : false;
        return eanMatch || nameMatch || categoryMatch || typeMatch || toonMatch || storeMatch || styleMatch;
      }

      return true;
    });
  }, [items, searchTerm, selectedStoreFilter]);

  // Sort filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortAsc
          ? (valA || '').localeCompare(valB || '')
          : (valB || '').localeCompare(valA || '');
      }

      return sortAsc ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0);
    });
  }, [filteredItems, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const handleSort = (
    field:
      | 'mainCategory'
      | 'productType'
      | 'name'
      | 'sku'
      | 'toonLabel'
      | 'wondersoftQty'
      | 'ecommerceQty'
      | 'difference'
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Copy EANs for clipboard
  const handleCopySingleSku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    onCopyNotice(`Copied EAN: ${sku}`);
  };

  const handleCopyAllSkusInTab = () => {
    const skus = sortedItems.map((i) => i.ean || i.sku).join('\n');
    navigator.clipboard.writeText(skus);
    onCopyNotice(`Copied ${sortedItems.length} EANs to clipboard`);
  };

  // Direct Excel Download with 8 required columns and color highlighting
  const handleDownloadExcel = () => {
    const { rowCount, filename } = exportChangedStockReport(
      items,
      undefined,
      undefined,
      { onlyChanged: false }
    );
    onCopyNotice(`✓ Downloaded ${filename} (${rowCount} rows). In-Sync (Diff 0) highlighted in green!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Bar: Title, Count, and Single Excel Download */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col gap-4">
        {/* Row 1: Header title + Download Excel button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>All Products</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {items.length.toLocaleString()} items
                </span>
              </h3>
            </div>
          </div>

          {/* Single Prominent Excel (.xlsx) Download */}
          <div>
            <button
              onClick={handleDownloadExcel}
              id="download-excel-btn"
              title="Download Excel file with stock comparison results"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Bar + Separate Store Name Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by EAN, Product Name, Store Name, or Style..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
          </div>

          {/* Dedicated Store Name Filter Dropdown */}
          {availableStores.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs">
              <Store className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Store:
              </span>
              <select
                value={selectedStoreFilter}
                onChange={(e) => {
                  setSelectedStoreFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="all">All Stores ({items.length})</option>
                {availableStores.map((store) => {
                  const storeItemCount = items.filter(
                    (i) => i.storeName.toLowerCase() === store.toLowerCase()
                  ).length;
                  return (
                    <option key={store} value={store}>
                      {store} ({storeItemCount})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Comparison Table with ALL User's Required Columns */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-blue-50/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {/* 1. Main Category */}
              <th
                onClick={() => handleSort('mainCategory')}
                className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Main Category
              </th>

              {/* 2. Product Type */}
              <th
                onClick={() => handleSort('productType')}
                className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Product Type
              </th>

              {/* 3. Product Name */}
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors min-w-[180px]"
              >
                Product Name
              </th>

              {/* 4. EAN */}
              <th
                onClick={() => handleSort('sku')}
                className="py-3 px-3 cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-blue-600" />
                  <span>EAN</span>
                </div>
              </th>

              {/* 5. Toon Label */}
              <th
                onClick={() => handleSort('toonLabel')}
                className="py-3 px-2.5 cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Toon Label
              </th>

              {/* 6. Current E-Com Stock */}
              <th
                onClick={() => handleSort('ecommerceQty')}
                className="py-3 px-3 text-right cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                E-Com Stock
              </th>

              {/* 7. Wondersoft ERP Stock */}
              <th
                onClick={() => handleSort('wondersoftQty')}
                className="py-3 px-3 text-right cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Wondersoft Stock
              </th>

              {/* 8. Difference */}
              <th
                onClick={() => handleSort('difference')}
                className="py-3 px-3 text-right cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                Diff
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-slate-700">No matching products found</p>
                    <p className="text-xs text-slate-400">
                      Try clearing search or changing your store filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isDecreased = item.hasDecreased;
                const isOos = item.isOutOfStock;
                const isZeroDiff = item.difference === 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isOos
                        ? 'bg-rose-50/30'
                        : isDecreased
                        ? 'bg-amber-50/25'
                        : isZeroDiff
                        ? 'bg-emerald-50/30'
                        : ''
                    }`}
                  >
                    {/* 1. Main Category */}
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {item.mainCategory ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                          {item.mainCategory}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 2. Product Type */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                      {item.productType || <span className="text-slate-400">—</span>}
                    </td>

                    {/* 3. Product Name */}
                    <td className="py-3 px-3 text-slate-800 font-medium max-w-[220px]">
                      <div className="truncate font-semibold text-slate-900" title={item.name}>
                        {item.name}
                      </div>
                      {item.styleNo && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Style: {item.styleNo}
                        </div>
                      )}
                    </td>

                    {/* 4. EAN */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <span>{item.ean || item.sku}</span>
                        <button
                          onClick={() => handleCopySingleSku(item.ean || item.sku)}
                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                          title="Copy EAN"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* 5. Toon Label */}
                    <td className="py-3 px-2.5 text-slate-700 whitespace-nowrap">
                      {item.toonLabel ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-medium text-[11px]">
                          {item.toonLabel}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 6. Current E-Com Stock */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                      {item.ecommerceQty.toLocaleString()}
                    </td>

                    {/* 7. Wondersoft ERP Stock */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                      {item.wondersoftQty.toLocaleString()}
                    </td>

                    {/* 8. Difference (Absolute numbers only, no minus signs) */}
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {isZeroDiff ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                          0
                        </span>
                      ) : (
                        <span className="text-slate-800">{Math.abs(item.difference)}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination & Batch Copy Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAllSkusInTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Copy All EANs ({sortedItems.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {sortedItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, sortedItems.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{sortedItems.length}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
