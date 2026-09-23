import React from 'react';
import { ArrowRightLeft, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  hasFiles: boolean;
  hasComparison: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  hasFiles,
  hasComparison,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-blue-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity - Pure Blue and White */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 shadow-sm flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                StockSync
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Wondersoft ERP ↔ E-Commerce
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate hidden xs:block">
              Daily ERP Closing Stock vs. Live Website Inventory
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {(hasFiles || hasComparison) && (
            <button
              onClick={onReset}
              id="reset-all-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer active:scale-95"
              title="Reset uploaded files and start over"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Files</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
