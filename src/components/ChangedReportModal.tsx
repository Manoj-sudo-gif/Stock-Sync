import React from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Palette,
} from 'lucide-react';
import { ColumnMapping, ComparisonItem, UploadedFile } from '../types';
import {
  downloadModifiedEcommerceFile,
  exportChangedStockReport,
} from '../utils/excel';

interface ChangedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ComparisonItem[];
  ecommerceFile: UploadedFile | null;
  columnMapping: ColumnMapping;
  onCopyNotice: (msg: string) => void;
  onUpdateTargetQty: (itemId: string, newQty: number) => void;
}

export const ChangedReportModal: React.FC<ChangedReportModalProps> = ({
  isOpen,
  onClose,
  items,
  ecommerceFile,
  columnMapping,
  onCopyNotice,
  onUpdateTargetQty,
}) => {
  if (!isOpen) return null;

  // Filter only items where stock changed or is manually edited
  const changedItems = items.filter(
    (i) => i.hasDecreased || i.isOutOfStock || i.difference !== 0 || i.isManuallyEdited
  );

  const totalSoldUnits = changedItems.reduce(
    (acc, curr) => acc + Math.abs(curr.difference),
    0
  );

  const outOfStockCount = changedItems.filter((i) => i.isOutOfStock).length;

  const handleDownloadReport = () => {
    const res = exportChangedStockReport(items);
    onCopyNotice(`✓ Downloaded Changed Stock Report (${res.rowCount} items) with color highlights!`);
  };

  const handleDownloadUpdatedEcommerce = () => {
    if (!ecommerceFile) {
      handleDownloadReport();
      return;
    }

    const res = downloadModifiedEcommerceFile({
      originalEcommerceRows: ecommerceFile.rawRows,
      ecommerceSkuCol: columnMapping.skuColumn,
      ecommerceQtyCol: columnMapping.ecommerceQtyColumn,
      comparisonItems: items,
      onlyChanged: false,
      baseName: `${ecommerceFile.name.replace(/\.[^/.]+$/, '')}_updated_stock`,
    });

    onCopyNotice(
      `✓ Downloaded updated E-Commerce Excel (${res.rowCount} rows). Changed stock cells highlighted in color!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-6xl max-h-[92vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-blue-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {changedItems.length} Products Changed
              </span>
              <span className="text-xs text-slate-500">
                &bull; Live Review & Export
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Changed Stock Review & Export
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review stock changes. Excel download highlights all modified stock cells in color.
            </p>
          </div>

          <button
            onClick={onClose}
            id="close-changed-report-modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Numbers Bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white text-center py-3">
          <div className="px-3">
            <span className="text-xs text-slate-500 block font-medium">Changed Items</span>
            <span className="text-lg font-bold text-amber-600 font-mono">
              {changedItems.length}
            </span>
          </div>
          <div className="px-3">
            <span className="text-xs text-slate-500 block font-medium">Stock Reduced (Offline Sales)</span>
            <span className="text-lg font-bold text-slate-900 font-mono">
              {totalSoldUnits.toLocaleString()} units
            </span>
          </div>
          <div className="px-3">
            <span className="text-xs text-slate-500 block font-medium">Out of Stock</span>
            <span className="text-lg font-bold text-rose-600 font-mono">
              {outOfStockCount}
            </span>
          </div>
        </div>

        {/* Download Action Bar - Clean Minimal Excel Download */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Palette className="w-4 h-4 text-amber-600" />
            <span>Excel export highlights all modified stock cells in color</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDownloadReport}
              id="download-changed-report-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Changed Report (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadUpdatedEcommerce}
              id="download-updated-ecom-file-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Updated Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Table with User's Required Columns */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-blue-50/60 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-2.5 px-3 whitespace-nowrap">Main Category</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Product Type</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Product Name</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">EAN</th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">Toon Label</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">E-Com Stock</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Wondersoft Stock</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {changedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      All products in your E-Commerce store match Wondersoft ERP stock!
                    </td>
                  </tr>
                ) : (
                  changedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        item.isOutOfStock ? 'bg-rose-50/40' : 'bg-amber-50/20'
                      }`}
                    >
                      {/* Main Category */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {item.mainCategory ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                            {item.mainCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Product Type */}
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                        {item.productType || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[200px]">
                        <div className="truncate font-semibold text-slate-900">{item.name}</div>
                        {item.styleNo && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Style: {item.styleNo}
                          </div>
                        )}
                      </td>

                      {/* EAN */}
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {item.ean || item.sku}
                      </td>

                      {/* Toon Label */}
                      <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap">
                        {item.toonLabel ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-medium text-[11px]">
                            {item.toonLabel}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 line-through">
                        {item.ecommerceQty}
                      </td>

                      {/* Wondersoft ERP Stock */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                        {item.wondersoftQty}
                      </td>

                      {/* Diff - Actual positive number only */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {item.difference === 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                            0
                          </span>
                        ) : (
                          <span className="text-slate-800">{Math.abs(item.difference)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Downloaded Excel files will have modified stock quantities highlighted in color.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
