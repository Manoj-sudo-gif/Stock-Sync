import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRightLeft, Sparkles, ShieldCheck, Store, Barcode } from 'lucide-react';
import { ColumnMapping, UploadedFile } from '../types';
import { extractUniqueStores } from '../utils/excel';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wondersoftFile: UploadedFile;
  ecommerceFile: UploadedFile;
  initialMapping: ColumnMapping;
  onConfirmMapping: (mapping: {
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
  }) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  wondersoftFile,
  ecommerceFile,
  initialMapping,
  onConfirmMapping,
}) => {
  // Mapping state
  const [wondersoftSkuCol, setWondersoftSkuCol] = useState(initialMapping.skuColumn || '');
  const [ecommerceSkuCol, setEcommerceSkuCol] = useState(initialMapping.skuColumn || '');

  // Separate Store Name state
  const [wondersoftStoreNameCol, setWondersoftStoreNameCol] = useState(
    initialMapping.wondersoftStoreNameColumn || ''
  );
  const [ecommerceStoreNameCol, setEcommerceStoreNameCol] = useState(
    initialMapping.ecommerceStoreNameColumn || initialMapping.storeNameColumn || ''
  );
  const [storeComparisonMode, setStoreComparisonMode] = useState<'all' | 'exact_store' | 'filter_store'>(
    initialMapping.storeComparisonMode || 'all'
  );
  const [selectedStore, setSelectedStore] = useState<string>(initialMapping.selectedStore || 'all');

  // Stock Quantities
  const [wondersoftQtyCol, setWondersoftQtyCol] = useState(
    initialMapping.wondersoftQtyColumn || ''
  );
  const [ecommerceQtyCol, setEcommerceQtyCol] = useState(initialMapping.ecommerceQtyColumn || '');

  // E-commerce required columns
  const [ecommerceNameCol, setEcommerceNameCol] = useState(initialMapping.nameColumn || '');
  const [mainCategoryCol, setMainCategoryCol] = useState(initialMapping.mainCategoryColumn || '');
  const [productTypeCol, setProductTypeCol] = useState(initialMapping.productTypeColumn || '');
  const [toonLabelCol, setToonLabelCol] = useState(initialMapping.toonLabelColumn || '');
  const [colorCol, setColorCol] = useState(initialMapping.colorColumn || '');
  const [sizeCol, setSizeCol] = useState(initialMapping.sizeColumn || '');
  const [columnExtraCol, setColumnExtraCol] = useState(initialMapping.columnExtraColumn || '');
  const [styleNoCol, setStyleNoCol] = useState(initialMapping.styleNoColumn || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean headers (filter out __EMPTY)
  const cleanWsHeaders = wondersoftFile.headers.filter((h) => h && !h.startsWith('__EMPTY'));
  const cleanEcomHeaders = ecommerceFile.headers.filter((h) => h && !h.startsWith('__EMPTY'));

  // Calculate available stores from files
  const availableStores = React.useMemo(() => {
    const ecomStores = extractUniqueStores(ecommerceFile.rawRows, ecommerceStoreNameCol);
    const wsStores = extractUniqueStores(wondersoftFile.rawRows, wondersoftStoreNameCol);
    const combined = Array.from(new Set([...ecomStores, ...wsStores])).filter(Boolean);
    return combined;
  }, [ecommerceFile.rawRows, wondersoftFile.rawRows, ecommerceStoreNameCol, wondersoftStoreNameCol]);

  // Synchronize and auto-select correct columns on load
  useEffect(() => {
    // 1. Separate Store Name detection
    const detectWsStore =
      cleanWsHeaders.find((h) => /^store.?name$/i.test(h)) ||
      cleanWsHeaders.find((h) => /store|branch/i.test(h)) ||
      '';
    const detectEcomStore =
      cleanEcomHeaders.find((h) => /^store.?name$/i.test(h)) ||
      cleanEcomHeaders.find((h) => /store|branch/i.test(h)) ||
      '';

    if (!cleanWsHeaders.includes(wondersoftStoreNameCol)) {
      setWondersoftStoreNameCol(detectWsStore);
    }
    if (!cleanEcomHeaders.includes(ecommerceStoreNameCol)) {
      setEcommerceStoreNameCol(detectEcomStore);
    }

    // 2. Strict EAN detection - NEVER select Store Name as EAN!
    const isStoreHeader = (h: string) => /store|branch/i.test(h);

    if (!cleanWsHeaders.includes(wondersoftSkuCol) || isStoreHeader(wondersoftSkuCol)) {
      const bestWsEan =
        cleanWsHeaders.find((h) => /^ean$/i.test(h)) ||
        cleanWsHeaders.find((h) => /barcode/i.test(h) && !isStoreHeader(h)) ||
        cleanWsHeaders.find((h) => /item.?code|code/i.test(h) && !isStoreHeader(h)) ||
        cleanWsHeaders.filter((h) => !isStoreHeader(h))[0] ||
        '';
      setWondersoftSkuCol(bestWsEan);
    }

    if (!cleanEcomHeaders.includes(ecommerceSkuCol) || isStoreHeader(ecommerceSkuCol)) {
      const bestEcomEan =
        cleanEcomHeaders.find((h) => /^ean$/i.test(h)) ||
        cleanEcomHeaders.find((h) => /ean/i.test(h) && !isStoreHeader(h)) ||
        cleanEcomHeaders.find((h) => /barcode/i.test(h) && !isStoreHeader(h)) ||
        cleanEcomHeaders.filter((h) => !isStoreHeader(h))[0] ||
        '';
      setEcommerceSkuCol(bestEcomEan);
    }

    // 3. Stock Columns
    if (!cleanWsHeaders.includes(wondersoftQtyCol)) {
      setWondersoftQtyCol(
        cleanWsHeaders.find((h) => /closing.?stock|cl.?qty/i.test(h)) ||
          cleanWsHeaders.find((h) => /closing|stock|qty|balance/i.test(h)) ||
          cleanWsHeaders[1] ||
          ''
      );
    }

    if (!cleanEcomHeaders.includes(ecommerceQtyCol)) {
      setEcommerceQtyCol(
        cleanEcomHeaders.find((h) => /^stock$/i.test(h)) ||
          cleanEcomHeaders.find((h) => /stock|qty|inventory/i.test(h)) ||
          ''
      );
    }

    // 4. E-Commerce specific columns
    if (!cleanEcomHeaders.includes(ecommerceNameCol)) {
      setEcommerceNameCol(
        cleanEcomHeaders.find((h) => /product.?name|productname/i.test(h)) ||
          cleanEcomHeaders.find((h) => /name|title|description/i.test(h)) ||
          ''
      );
    }

    if (!cleanEcomHeaders.includes(toonLabelCol)) {
      setToonLabelCol(
        cleanEcomHeaders.find((h) => /toon.?label|toonlabel|town.?label|label/i.test(h)) || ''
      );
    }

    if (!cleanEcomHeaders.includes(colorCol)) {
      setColorCol(
        cleanEcomHeaders.find((h) => /colour|color|shade/i.test(h)) || ''
      );
    }

    if (!cleanEcomHeaders.includes(sizeCol)) {
      setSizeCol(
        cleanEcomHeaders.find((h) => /^size$/i.test(h)) ||
          cleanEcomHeaders.find((h) => /size|sixe/i.test(h)) ||
          ''
      );
    }

    if (!cleanEcomHeaders.includes(columnExtraCol)) {
      setColumnExtraCol(
        cleanEcomHeaders.find((h) => /^column$/i.test(h)) ||
          cleanEcomHeaders.find((h) => /column|col/i.test(h)) ||
          ''
      );
    }

    if (!cleanEcomHeaders.includes(styleNoCol)) {
      setStyleNoCol(
        cleanEcomHeaders.find((h) => /style.?no|styleno|style/i.test(h)) || ''
      );
    }
  }, [wondersoftFile, ecommerceFile, initialMapping]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wondersoftSkuCol || !ecommerceSkuCol) {
      setErrorMsg('Please select the EAN column for both files.');
      return;
    }
    if (!wondersoftQtyCol || !ecommerceQtyCol) {
      setErrorMsg('Please select the Stock Quantity column for both files.');
      return;
    }

    setErrorMsg(null);
    onConfirmMapping({
      wondersoftSkuCol,
      ecommerceSkuCol,
      wondersoftNameCol: wondersoftSkuCol,
      ecommerceNameCol: ecommerceNameCol || ecommerceSkuCol,
      wondersoftQtyCol,
      ecommerceQtyCol,
      mainCategoryCol: mainCategoryCol || undefined,
      productTypeCol: productTypeCol || undefined,
      wondersoftStoreNameCol: wondersoftStoreNameCol || undefined,
      ecommerceStoreNameCol: ecommerceStoreNameCol || undefined,
      storeNameCol: ecommerceStoreNameCol || undefined,
      toonLabelCol: toonLabelCol || undefined,
      colorCol: colorCol || undefined,
      sizeCol: sizeCol || undefined,
      columnExtraCol: columnExtraCol || undefined,
      styleNoCol: styleNoCol || undefined,
      storeComparisonMode,
      selectedStore: storeComparisonMode === 'filter_store' ? selectedStore : undefined,
    });
  };

  const previewWsRow = wondersoftFile.rawRows[0] || {};
  const previewEcomRow = ecommerceFile.rawRows[0] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Column Mapping
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  EAN & Store Setup
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Match by EAN and configure Store Name comparison
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guarantee Banner */}
        <div className="bg-emerald-50 px-5 sm:px-6 py-2.5 border-b border-emerald-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Zero Columns Deleted: All columns (store name, ean, product name, toon label, colour, size, column, stock) will be retained.
          </span>
        </div>

        {/* Mapping Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* 1. EAN Unique Identifier */}
          <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </div>
                <Barcode className="w-4 h-4 text-blue-600" />
                Unique Identifier: EAN Column
              </label>
              <span className="text-[11px] font-bold text-blue-600">Strict Match</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  Wondersoft ERP (EAN / Barcode):
                </span>
                <select
                  value={wondersoftSkuCol}
                  onChange={(e) => setWondersoftSkuCol(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 rounded-xl bg-white border border-blue-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {cleanWsHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample EAN: <span className="font-mono font-bold text-blue-700">{String(previewWsRow[wondersoftSkuCol] || '—')}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  E-Commerce Store (Ean):
                </span>
                <select
                  value={ecommerceSkuCol}
                  onChange={(e) => setEcommerceSkuCol(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-3 rounded-xl bg-white border border-blue-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                >
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample Ean: <span className="font-mono font-bold text-blue-700">{String(previewEcomRow[ecommerceSkuCol] || '—')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Separate Store Name Comparison */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">
                  2
                </div>
                <Store className="w-4 h-4 text-slate-700" />
                Store Name (Separate Comparison & Filter)
              </label>
              <span className="text-[11px] font-semibold text-slate-500">Store Filter</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  Wondersoft Store Name:
                </span>
                <select
                  value={wondersoftStoreNameCol}
                  onChange={(e) => setWondersoftStoreNameCol(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Store Column --</option>
                  {cleanWsHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample: <span className="font-semibold text-slate-800">{String(previewWsRow[wondersoftStoreNameCol] || '—')}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  E-Commerce Store Name:
                </span>
                <select
                  value={ecommerceStoreNameCol}
                  onChange={(e) => setEcommerceStoreNameCol(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Store Column --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample: <span className="font-semibold text-slate-800">{String(previewEcomRow[ecommerceStoreNameCol] || '—')}</span>
                </div>
              </div>
            </div>

            {/* Store Comparison Mode Options */}
            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-xs font-semibold text-slate-700 mb-2 block">
                Store Comparison Method:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStoreComparisonMode('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    storeComparisonMode === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">All Stores</div>
                  <div className={`text-[10px] ${storeComparisonMode === 'all' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Compare by EAN across file
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStoreComparisonMode('exact_store')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    storeComparisonMode === 'exact_store'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Match Same Store</div>
                  <div className={`text-[10px] ${storeComparisonMode === 'exact_store' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Match Store Name + EAN
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStoreComparisonMode('filter_store')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all cursor-pointer ${
                    storeComparisonMode === 'filter_store'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold">Filter By Store</div>
                  <div className={`text-[10px] ${storeComparisonMode === 'filter_store' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Select 1 specific store
                  </div>
                </button>
              </div>

              {/* If Filter By Store is chosen */}
              {storeComparisonMode === 'filter_store' && availableStores.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200">
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Select Store to Compare:
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Stores</option>
                    {availableStores.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 3. Stock Quantity Columns */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  3
                </div>
                Stock Quantity Columns (Compare Values)
              </label>
              <span className="text-[11px] font-semibold text-blue-600">Required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  Wondersoft ERP Stock (Closing Qty):
                </span>
                <select
                  value={wondersoftQtyCol}
                  onChange={(e) => setWondersoftQtyCol(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cleanWsHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample Stock: <span className="font-mono font-bold text-blue-600">{String(previewWsRow[wondersoftQtyCol] ?? 0)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">
                  E-Commerce Store Stock:
                </span>
                <select
                  value={ecommerceQtyCol}
                  onChange={(e) => setEcommerceQtyCol(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  Sample Stock: <span className="font-mono font-bold text-slate-800">{String(previewEcomRow[ecommerceQtyCol] ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. E-Commerce Display Columns */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-bold">
                4
              </div>
              E-Commerce Columns (product name, toon label, colour, size, column, style no)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Product Name:</span>
                <select
                  value={ecommerceNameCol}
                  onChange={(e) => setEcommerceNameCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Toon Label:</span>
                <select
                  value={toonLabelCol}
                  onChange={(e) => setToonLabelCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Colour:</span>
                <select
                  value={colorCol}
                  onChange={(e) => setColorCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Size:</span>
                <select
                  value={sizeCol}
                  onChange={(e) => setSizeCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Column:</span>
                <select
                  value={columnExtraCol}
                  onChange={(e) => setColumnExtraCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 block">Style No:</span>
                <select
                  value={styleNoCol}
                  onChange={(e) => setStyleNoCol(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- None --</option>
                  {cleanEcomHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-mapping-submit-btn"
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Compare Stocks</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
