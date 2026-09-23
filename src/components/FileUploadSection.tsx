import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Trash2,
  Layers,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadSectionProps {
  wondersoftFile: UploadedFile | null;
  ecommerceFile: UploadedFile | null;
  onFileUpload: (file: File, type: 'wondersoft' | 'ecommerce') => Promise<void>;
  onRemoveFile: (type: 'wondersoft' | 'ecommerce') => void;
  onSheetChange: (type: 'wondersoft' | 'ecommerce', sheetName: string) => void;
  isProcessing: boolean;
  onOpenMapping: () => void;
  canCompare: boolean;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  wondersoftFile,
  ecommerceFile,
  onFileUpload,
  onRemoveFile,
  onSheetChange,
  isProcessing,
  onOpenMapping,
  canCompare,
}) => {
  return (
    <div className="w-full space-y-6">
      {/* Dual File Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* File 1: Wondersoft ERP Daily Stock */}
        <UploadCard
          id="upload-wondersoft"
          badgeText="ERP Source"
          title="1. Wondersoft Daily Stock Report"
          description="Exported ERP closing stock file (.xlsx, .xls, .csv)"
          file={wondersoftFile}
          onUpload={(f) => onFileUpload(f, 'wondersoft')}
          onRemove={() => onRemoveFile('wondersoft')}
          onSheetChange={(s) => onSheetChange('wondersoft', s)}
          isProcessing={isProcessing}
          hint="Expected: EAN / Barcode, Item Name, Closing Stock"
        />

        {/* File 2: E-Commerce Store Stock */}
        <UploadCard
          id="upload-ecommerce"
          badgeText="E-Commerce Store"
          title="2. E-Commerce Store Stock File"
          description="Current website inventory file (.xlsx, .xls, .csv)"
          file={ecommerceFile}
          onUpload={(f) => onFileUpload(f, 'ecommerce')}
          onRemove={() => onRemoveFile('ecommerce')}
          onSheetChange={(s) => onSheetChange('ecommerce', s)}
          isProcessing={isProcessing}
          hint="Supports 16 columns: main category, product type, department, product name, brand, colour, size, fabric, ean, toon label, selling price, total stock quantity..."
        />
      </div>

      {/* Action Banner when both files are uploaded */}
      {canCompare && (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Both Files Ready for Comparison
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {wondersoftFile?.rawRows.length.toLocaleString()} ERP rows &bull;{' '}
                {ecommerceFile?.rawRows.length.toLocaleString()} E-Commerce products
              </p>
            </div>
          </div>

          <button
            onClick={onOpenMapping}
            id="compare-stock-btn"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Compare Stock Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

interface UploadCardProps {
  id: string;
  badgeText: string;
  title: string;
  description: string;
  file: UploadedFile | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
  onSheetChange: (sheetName: string) => void;
  isProcessing: boolean;
  hint: string;
}

const UploadCard: React.FC<UploadCardProps> = ({
  id,
  badgeText,
  title,
  description,
  file,
  onUpload,
  onRemove,
  onSheetChange,
  isProcessing,
  hint,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndUpload = async (selectedFile: File) => {
    setErrorMsg(null);
    const validExts = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExts.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setErrorMsg('Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    try {
      await onUpload(selectedFile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error parsing spreadsheet file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div
      id={id}
      className={`bg-white p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden border shadow-xs ${
        isDragging
          ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10'
          : file
          ? 'border-blue-200'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
            {badgeText}
          </span>
          {file && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 mb-0.5">{title}</h3>
        <p className="text-xs text-slate-500 mb-4">{description}</p>
      </div>

      {/* Main Body: Upload Area or Loaded File Summary */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            <span className="text-blue-600 underline underline-offset-2">Click to select file</span>{' '}
            or drag and drop
          </p>
          <p className="text-xs text-slate-400">Supports .xlsx, .xls, or .csv</p>
          <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono">
            {hint}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB &bull;{' '}
                  <span className="font-semibold text-slate-800">
                    {file.rawRows.length.toLocaleString()} rows
                  </span>{' '}
                  &bull; {file.headers.length} columns
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove file"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Sheet Selector if multiple sheets exist */}
          {file.sheets.length > 1 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label className="text-xs font-semibold text-slate-700 shrink-0">Sheet:</label>
              <select
                value={file.selectedSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className="text-xs py-1 px-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {file.sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Detected Headers preview */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Detected Columns:
            </span>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {file.headers.slice(0, 7).map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-slate-700 border border-slate-200 truncate max-w-[130px]"
                >
                  {h}
                </span>
              ))}
              {file.headers.length > 7 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400">
                  +{file.headers.length - 7} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
