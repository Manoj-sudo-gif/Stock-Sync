import React from 'react';
import { Package, TrendingDown, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ComparisonSummary, TabKey } from '../types';

interface SummaryCardsProps {
  summary: ComparisonSummary;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total E-Commerce Products */}
      <div
        onClick={() => onSelectTab('all')}
        id="card-total-items"
        className={`bg-white p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-150 border shadow-xs ${
          activeTab === 'all'
            ? 'border-blue-600 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">
            Total Compared
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {summary.totalCompared.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-slate-500">Items</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          E-Commerce Products Checked
        </p>
      </div>

      {/* 2. Stock Decreased Items (Priority) */}
      <div
        onClick={() => onSelectTab('decreased')}
        id="card-stock-decreased"
        className={`bg-white p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-150 border shadow-xs ${
          activeTab === 'decreased'
            ? 'border-amber-600 ring-2 ring-amber-500/20'
            : 'border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Stock Decreased
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600">
            {summary.stockDecreasedCount.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-amber-700">Update Needed</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 truncate">
          {summary.totalUnitsDecreased > 0 ? (
            <span className="font-bold text-amber-700">
              -{summary.totalUnitsDecreased.toLocaleString()} units
            </span>
          ) : (
            'ERP < Store'
          )}{' '}
          sold offline
        </p>
      </div>

      {/* 3. Out of Stock Items */}
      <div
        onClick={() => onSelectTab('out_of_stock')}
        id="card-out-of-stock"
        className={`bg-white p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-150 border shadow-xs ${
          activeTab === 'out_of_stock'
            ? 'border-rose-600 ring-2 ring-rose-500/20'
            : 'border-slate-200 hover:border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Out of Stock
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600">
            {summary.outOfStockCount.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-rose-700">Stock = 0</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 truncate">
          ERP is 0 but website shows in stock
        </p>
      </div>

      {/* 4. In Sync */}
      <div
        onClick={() => onSelectTab('in_sync')}
        id="card-in-sync"
        className={`bg-white p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-150 border shadow-xs ${
          activeTab === 'in_sync'
            ? 'border-emerald-600 ring-2 ring-emerald-500/20'
            : 'border-slate-200 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-emerald-700">
            In Sync
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600">
            {summary.inSyncCount.toLocaleString()}
          </span>
          <span className="text-xs font-semibold text-emerald-700">Matches</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 truncate">
          Stock quantities match exactly
        </p>
      </div>
    </div>
  );
};
