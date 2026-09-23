export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  sheets: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  headerRowIndex?: number;
}

export interface ColumnMapping {
  skuColumn: string; // EAN
  nameColumn: string; // Product Name
  wondersoftQtyColumn: string;
  ecommerceQtyColumn: string;
  mainCategoryColumn?: string;
  productTypeColumn?: string;
  wondersoftStoreNameColumn?: string;
  ecommerceStoreNameColumn?: string;
  styleNoColumn?: string;
  sizeColumn?: string;
  storeNameColumn?: string;
  toonLabelColumn?: string;
  colorColumn?: string;
  columnExtraColumn?: string;
  storeComparisonMode?: 'all' | 'exact_store' | 'filter_store';
  selectedStore?: string;
}

export type StockStatus =
  | 'out_of_stock'
  | 'stock_decreased'
  | 'in_sync'
  | 'stock_increased'
  | 'only_in_wondersoft'
  | 'only_in_ecommerce';

export interface ComparisonItem {
  id: string;
  sku: string; // EAN
  ean: string;
  mainCategory?: string; // Main Category
  productType?: string; // Product Type
  storeName: string;
  name: string; // Product Name
  toonLabel?: string;
  color?: string;
  size?: string;
  columnExtra?: string; // "column"
  styleNo?: string;
  wondersoftQty: number; // Wondersoft Stock
  ecommerceQty: number; // E-Com Stock
  targetQty: number; // Editable new stock quantity
  difference: number; // Diff (targetQty - ecommerceQty)
  status: StockStatus;
  hasDecreased: boolean;
  isOutOfStock: boolean;
  isInSync: boolean;
  isManuallyEdited?: boolean;
  sourceWondersoftRow?: Record<string, any>;
  sourceEcommerceRow?: Record<string, any>;
}

export interface ComparisonSummary {
  totalCompared: number;
  stockDecreasedCount: number;
  outOfStockCount: number;
  inSyncCount: number;
  stockIncreasedCount: number;
  onlyInWondersoftCount: number;
  onlyInEcommerceCount: number;
  totalUnitsDecreased: number;
  availableStores: string[];
}

export type TabKey = 'all' | 'changed' | 'decreased' | 'out_of_stock' | 'in_sync';
