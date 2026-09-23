/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileUploadSection } from './components/FileUploadSection';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { ComparisonTable } from './components/ComparisonTable';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  ColumnMapping,
  ComparisonItem,
  ComparisonSummary,
  TabKey,
  UploadedFile,
} from './types';
import {
  autoDetectColumns,
  changeSpreadsheetSheet,
  compareStockData,
  parseSpreadsheetFile,
} from './utils/excel';
import {
  ArrowRightLeft,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  // Files state
  const [wondersoftFile, setWondersoftFile] = useState<UploadedFile | null>(null);
  const [ecommerceFile, setEcommerceFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Column mapping & modal state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    skuColumn: '',
    nameColumn: '',
    wondersoftQtyColumn: '',
    ecommerceQtyColumn: '',
    storeComparisonMode: 'all',
  });
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);

  // Comparison results state
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[] | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<ComparisonSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('decreased');
  const [showUploadAccordion, setShowUploadAccordion] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Run stock comparison directly with auto-detected mapping
  const runDirectComparison = (
    ws: UploadedFile,
    ecom: UploadedFile,
    customMapping?: ColumnMapping
  ) => {
    setIsProcessing(true);
    try {
      const auto =
        customMapping ||
        autoDetectColumns(ws.headers, ecom.headers, ws.rawRows, ecom.rawRows);

      setColumnMapping(auto);

      const mappingParam = {
        wondersoftSkuCol: auto.skuColumn,
        ecommerceSkuCol: auto.skuColumn,
        wondersoftNameCol: auto.nameColumn,
        ecommerceNameCol: auto.nameColumn,
        wondersoftQtyCol: auto.wondersoftQtyColumn,
        ecommerceQtyCol: auto.ecommerceQtyColumn,
        mainCategoryCol: auto.mainCategoryColumn,
        productTypeCol: auto.productTypeColumn,
        wondersoftStoreNameCol: auto.wondersoftStoreNameColumn,
        ecommerceStoreNameCol: auto.ecommerceStoreNameColumn,
        storeNameCol: auto.storeNameColumn,
        toonLabelCol: auto.toonLabelColumn,
        colorCol: auto.colorColumn,
        sizeCol: auto.sizeColumn,
        columnExtraCol: auto.columnExtraColumn,
        styleNoCol: auto.styleNoColumn,
        storeComparisonMode: auto.storeComparisonMode || 'all',
        selectedStore: auto.selectedStore,
      };

      const result = compareStockData(ws.rawRows, ecom.rawRows, mappingParam);

      setComparisonItems(result.items);
      setComparisonSummary(result.summary);
      setIsMappingModalOpen(false);
      setActiveTab('all'); // Show all products view directly as requested
      setShowUploadAccordion(false);

      addToast(
        `✓ Stock checked! ${result.summary.totalCompared} E-Commerce products checked vs ERP.`
      );
    } catch (err: any) {
      addToast(`Error during comparison: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle single file upload
  const handleFileUpload = async (file: File, type: 'wondersoft' | 'ecommerce') => {
    setIsProcessing(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (type === 'wondersoft') {
        setWondersoftFile(parsed);
        addToast(`Loaded Wondersoft ERP report: ${parsed.rawRows.length} rows.`);
        if (ecommerceFile) {
          runDirectComparison(parsed, ecommerceFile);
        }
      } else {
        setEcommerceFile(parsed);
        addToast(`Loaded E-Commerce stock file: ${parsed.rawRows.length} rows.`);
        if (wondersoftFile) {
          runDirectComparison(wondersoftFile, parsed);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Error parsing file', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle sheet change in multi-sheet Excel
  const handleSheetChange = (type: 'wondersoft' | 'ecommerce', sheetName: string) => {
    const targetFile = type === 'wondersoft' ? wondersoftFile : ecommerceFile;
    if (!targetFile) return;

    targetFile.file.arrayBuffer().then((buf) => {
      const { headers, rawRows } = changeSpreadsheetSheet(buf, sheetName);
      const updated: UploadedFile = {
        ...targetFile,
        selectedSheet: sheetName,
        headers,
        rawRows,
      };
      if (type === 'wondersoft') {
        setWondersoftFile(updated);
        if (ecommerceFile) {
          runDirectComparison(updated, ecommerceFile);
        }
      } else {
        setEcommerceFile(updated);
        if (wondersoftFile) {
          runDirectComparison(wondersoftFile, updated);
        }
      }
    });
  };

  // Remove file
  const handleRemoveFile = (type: 'wondersoft' | 'ecommerce') => {
    if (type === 'wondersoft') setWondersoftFile(null);
    else setEcommerceFile(null);
    setComparisonItems(null);
    setComparisonSummary(null);
  };

  // Reset all
  const handleReset = () => {
    setWondersoftFile(null);
    setEcommerceFile(null);
    setComparisonItems(null);
    setComparisonSummary(null);
    setActiveTab('decreased');
    setShowUploadAccordion(false);
    addToast('Reset files. Please upload your files to compare.', 'info');
  };

  // Confirm mapping and run comparison
  const handleConfirmMapping = (mapping: {
    wondersoftSkuCol: string;
    ecommerceSkuCol: string;
    wondersoftNameCol: string;
    ecommerceNameCol: string;
    wondersoftQtyCol: string;
    ecommerceQtyCol: string;
    mainCategoryCol?: string;
    productTypeCol?: string;
    wondersoftStoreNameCol?: string;
    ecommerceStoreNameCol?: string;
    storeNameCol?: string;
    toonLabelCol?: string;
    colorCol?: string;
    sizeCol?: string;
    columnExtraCol?: string;
    styleNoCol?: string;
    storeComparisonMode?: 'all' | 'exact_store' | 'filter_store';
    selectedStore?: string;
  }) => {
    if (!wondersoftFile || !ecommerceFile) return;

    setIsProcessing(true);
    try {
      const result = compareStockData(
        wondersoftFile.rawRows,
        ecommerceFile.rawRows,
        mapping
      );

      setColumnMapping({
        skuColumn: mapping.ecommerceSkuCol,
        nameColumn: mapping.ecommerceNameCol,
        wondersoftQtyColumn: mapping.wondersoftQtyCol,
        ecommerceQtyColumn: mapping.ecommerceQtyCol,
        mainCategoryColumn: mapping.mainCategoryCol,
        productTypeColumn: mapping.productTypeCol,
        wondersoftStoreNameColumn: mapping.wondersoftStoreNameCol,
        ecommerceStoreNameColumn: mapping.ecommerceStoreNameCol,
        storeNameColumn: mapping.ecommerceStoreNameCol || mapping.storeNameCol,
        styleNoColumn: mapping.styleNoCol,
        sizeColumn: mapping.sizeCol,
        toonLabelColumn: mapping.toonLabelCol,
        colorColumn: mapping.colorCol,
        columnExtraColumn: mapping.columnExtraCol,
        storeComparisonMode: mapping.storeComparisonMode,
        selectedStore: mapping.selectedStore,
      });

      setComparisonItems(result.items);
      setComparisonSummary(result.summary);
      setIsMappingModalOpen(false);
      setActiveTab('all');
      setShowUploadAccordion(false);

      addToast(
        `Comparison complete: ${result.summary.totalCompared} E-Commerce products checked. ${result.summary.stockDecreasedCount} require stock reduction.`
      );
    } catch (err: any) {
      addToast(`Error during comparison: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Live Inline Stock Quantity Editing handler
  const handleUpdateItemTargetQty = (itemId: string, newTargetQty: number) => {
    if (!comparisonItems) return;
    const clamped = Math.max(0, isNaN(newTargetQty) ? 0 : newTargetQty);

    setComparisonItems((prev) => {
      if (!prev) return null;
      const updated = prev.map((item) => {
        if (item.id === itemId) {
          const diff = clamped - item.ecommerceQty;
          const isOos = clamped <= 0 && item.ecommerceQty > 0;
          const hasDec = clamped < item.ecommerceQty;
          const inSync = clamped === item.ecommerceQty;

          let status = item.status;
          if (isOos) status = 'out_of_stock';
          else if (hasDec) status = 'stock_decreased';
          else if (inSync) status = 'in_sync';
          else status = 'stock_increased';

          return {
            ...item,
            targetQty: clamped,
            difference: diff,
            status,
            hasDecreased: hasDec,
            isOutOfStock: isOos,
            isInSync: inSync,
            isManuallyEdited: true,
          };
        }
        return item;
      });

      // Recalculate summary metrics dynamically
      let stockDecreasedCount = 0;
      let outOfStockCount = 0;
      let inSyncCount = 0;
      let stockIncreasedCount = 0;
      let onlyInWondersoftCount = 0;
      let onlyInEcommerceCount = 0;
      let totalUnitsDecreased = 0;

      for (const it of updated) {
        if (it.status === 'out_of_stock') {
          outOfStockCount++;
          stockDecreasedCount++;
          totalUnitsDecreased += Math.max(0, it.ecommerceQty - it.targetQty);
        } else if (it.status === 'stock_decreased') {
          stockDecreasedCount++;
          totalUnitsDecreased += Math.max(0, it.ecommerceQty - it.targetQty);
        } else if (it.status === 'in_sync') {
          inSyncCount++;
        } else if (it.status === 'stock_increased') {
          stockIncreasedCount++;
        } else if (it.status === 'only_in_wondersoft') {
          onlyInWondersoftCount++;
        } else if (it.status === 'only_in_ecommerce') {
          onlyInEcommerceCount++;
        }
      }

      setComparisonSummary((prevSummary) => ({
        totalCompared: updated.length,
        stockDecreasedCount,
        outOfStockCount,
        inSyncCount,
        stockIncreasedCount,
        onlyInWondersoftCount,
        onlyInEcommerceCount,
        totalUnitsDecreased,
        availableStores: prevSummary?.availableStores || [],
      }));

      return updated;
    });
  };

  const hasFiles = Boolean(wondersoftFile || ecommerceFile);
  const canCompare = Boolean(wondersoftFile && ecommerceFile);
  const hasComparison = Boolean(comparisonItems && comparisonSummary);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Blue & White Header */}
      <Header
        onReset={handleReset}
        hasFiles={hasFiles}
        hasComparison={hasComparison}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {!hasComparison ? (
          <div className="space-y-6">
            {/* Header Title Area */}
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Compare Stock: Wondersoft ERP vs. E-Commerce
              </h2>
            </div>

            {/* Dual Upload Section */}
            <FileUploadSection
              wondersoftFile={wondersoftFile}
              ecommerceFile={ecommerceFile}
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
              onSheetChange={handleSheetChange}
              isProcessing={isProcessing}
              onOpenMapping={() => {
                if (wondersoftFile && ecommerceFile) {
                  runDirectComparison(wondersoftFile, ecommerceFile);
                }
              }}
              canCompare={canCompare}
            />
          </div>
        ) : (
          /* Active Comparison Dashboard */
          <div className="space-y-6">
            {/* Collapsible Source Files Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                        {wondersoftFile?.name || 'Wondersoft ERP'}
                      </span>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {ecommerceFile?.name || 'E-Commerce Stock'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        Identifier (EAN): <code className="font-mono text-blue-700 font-bold">{columnMapping.skuColumn || 'EAN'}</code>
                      </span>
                      {columnMapping.storeNameColumn && (
                        <span>
                          Store: <span className="font-semibold text-slate-700">{columnMapping.storeNameColumn}</span>
                          {columnMapping.selectedStore && columnMapping.selectedStore !== 'all' && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                              {columnMapping.selectedStore}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setShowUploadAccordion(!showUploadAccordion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  >
                    <span>{showUploadAccordion ? 'Hide Files' : 'Replace Files'}</span>
                    {showUploadAccordion ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Accordion Upload Section */}
              {showUploadAccordion && (
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <FileUploadSection
                    wondersoftFile={wondersoftFile}
                    ecommerceFile={ecommerceFile}
                    onFileUpload={handleFileUpload}
                    onRemoveFile={handleRemoveFile}
                    onSheetChange={handleSheetChange}
                    isProcessing={isProcessing}
                    onOpenMapping={() => {
                      if (wondersoftFile && ecommerceFile) {
                        runDirectComparison(wondersoftFile, ecommerceFile);
                      }
                    }}
                    canCompare={canCompare}
                  />
                </div>
              )}
            </div>

            {/* Detailed Data Table with Live Editing and Single Excel Download */}
            {comparisonItems && (
              <ComparisonTable
                items={comparisonItems}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab)}
                onCopyNotice={(msg) => addToast(msg, 'info')}
                onUpdateTargetQty={handleUpdateItemTargetQty}
                ecommerceFile={ecommerceFile}
                columnMapping={columnMapping}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Area */}
      <footer className="mt-auto py-6 border-t border-slate-200/80 bg-white/50 backdrop-blur-xs text-center text-xs text-slate-500 font-medium">
        <p className="flex items-center justify-center gap-2 flex-wrap">
          <span>© {new Date().getFullYear()} All Rights Reserved</span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-700">Made by Two Fellows 😎</span>
        </p>
      </footer>

      {/* Column Mapping Modal */}
      {wondersoftFile && ecommerceFile && (
        <ColumnMappingModal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          wondersoftFile={wondersoftFile}
          ecommerceFile={ecommerceFile}
          initialMapping={columnMapping}
          onConfirmMapping={handleConfirmMapping}
        />
      )}
    </div>
  );
}
