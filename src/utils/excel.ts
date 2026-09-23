import * as XLSX_BASE from 'xlsx';
import XLSX_STYLE from 'xlsx-js-style';
import { ColumnMapping, ComparisonItem, ComparisonSummary, UploadedFile } from '../types';

// Use xlsx-js-style for rich Excel generation with colors, and xlsx for parsing
const XLSX_WRITER = XLSX_STYLE || XLSX_BASE;
const XLSX_READER = XLSX_BASE;

/**
 * Robust Spreadsheet Parser
 * Intelligently identifies the TRUE header row in Wondersoft ERP and E-Commerce files,
 * eliminating company title banners (like "GM FASHIONS") and preventing __EMPTY column names.
 */
export function extractHeadersAndRows(worksheet: XLSX_BASE.WorkSheet): {
  headers: string[];
  rawRows: Record<string, any>[];
  headerRowIndex: number;
} {
  const sheetData: any[][] = XLSX_READER.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!sheetData || sheetData.length === 0) {
    return { headers: [], rawRows: [], headerRowIndex: 0 };
  }

  // Keywords commonly present in retail ERP and e-commerce stock spreadsheets
  const headerKeywords = [
    'ean',
    'barcode',
    'item code',
    'itemcode',
    'item_code',
    'code',
    'item name',
    'item_name',
    'product name',
    'productname',
    'description',
    'desc',
    'item desc',
    'closing stock',
    'closing_stock',
    'cl.qty',
    'cl. stock',
    'cl stock',
    'closing qty',
    'stock',
    'qty',
    'balance',
    'physical stock',
    'current stock',
    'style no',
    'styleno',
    'style_no',
    'style',
    'item no',
    'size',
    'sixe',
    'colour',
    'color',
    'shade',
    'store name',
    'storename',
    'store',
    'branch',
    'toon label',
    'toonlabel',
    'town label',
    'label',
    'column',
    'mrp',
    'rate',
    'price',
    'category',
    'department',
  ];

  let bestRowIndex = 0;
  let maxScore = -1;

  // Scan up to first 25 rows to identify the real column headers
  const scanLimit = Math.min(25, sheetData.length);
  for (let r = 0; r < scanLimit; r++) {
    const row = sheetData[r] || [];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nonEmptyCells = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (nonEmptyCells.length < 2) {
      // 0 or 1 cell is likely a title banner like "GM FASHIONS"
      continue;
    }

    let keywordMatches = 0;
    for (const cell of nonEmptyCells) {
      const lower = cell.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      if (headerKeywords.some((kw) => lower.includes(kw) || kw.includes(lower))) {
        keywordMatches++;
      }
    }

    const textCellCount = nonEmptyCells.filter((c) => isNaN(Number(c))).length;
    const score = keywordMatches * 25 + textCellCount * 2 + nonEmptyCells.length;

    if (score > maxScore && (keywordMatches > 0 || nonEmptyCells.length >= 3)) {
      maxScore = score;
      bestRowIndex = r;
    }
  }

  // Fallback: If no keyword matched, find the first row with >= 3 text cells
  if (maxScore <= 0) {
    for (let r = 0; r < scanLimit; r++) {
      const row = sheetData[r] || [];
      const textCells = row
        .map((c) => String(c ?? '').trim())
        .filter((c) => c && isNaN(Number(c)));
      if (textCells.length >= 3) {
        bestRowIndex = r;
        break;
      }
    }
  }

  const headerRow = sheetData[bestRowIndex] || [];

  // Find last non-empty column index to trim trailing blank columns
  let lastNonEmptyCol = -1;
  for (let c = headerRow.length - 1; c >= 0; c--) {
    if (String(headerRow[c] ?? '').trim() !== '') {
      lastNonEmptyCol = c;
      break;
    }
  }

  const effectiveColCount = lastNonEmptyCol >= 0 ? lastNonEmptyCol + 1 : headerRow.length;
  const headers: string[] = [];
  const seenHeaders = new Map<string, number>();

  for (let c = 0; c < effectiveColCount; c++) {
    let rawH = String(headerRow[c] ?? '').trim();
    if (!rawH || rawH.startsWith('__EMPTY')) {
      rawH = `Column_${c + 1}`;
    }

    let uniqueH = rawH;
    if (seenHeaders.has(rawH.toLowerCase())) {
      const count = seenHeaders.get(rawH.toLowerCase())! + 1;
      seenHeaders.set(rawH.toLowerCase(), count);
      uniqueH = `${rawH}_${count}`;
    } else {
      seenHeaders.set(rawH.toLowerCase(), 1);
    }
    headers.push(uniqueH);
  }

  // Construct rawRows starting from the row after headers
  const rawRows: Record<string, any>[] = [];
  for (let r = bestRowIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r] || [];
    if (!Array.isArray(row) || row.length === 0) continue;

    const hasData = row.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasData) continue;

    const firstCell = String(row[0] ?? '').trim().toLowerCase();
    const secondCell = String(row[1] ?? '').trim().toLowerCase();
    if (
      firstCell.startsWith('total') ||
      firstCell.startsWith('grand total') ||
      secondCell.startsWith('total') ||
      secondCell.startsWith('grand total')
    ) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = row[c] !== undefined ? row[c] : '';
    }
    rawRows.push(rowObj);
  }

  return {
    headers,
    rawRows,
    headerRowIndex: bestRowIndex,
  };
}

export async function parseSpreadsheetFile(file: File): Promise<UploadedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX_READER.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheets = workbook.SheetNames;
  const selectedSheet = sheets[0] || '';
  const worksheet = workbook.Sheets[selectedSheet];

  const { headers, rawRows, headerRowIndex } = worksheet
    ? extractHeadersAndRows(worksheet)
    : { headers: [], rawRows: [], headerRowIndex: 0 };

  return {
    file,
    name: file.name,
    size: file.size,
    sheets,
    selectedSheet,
    headers,
    rawRows,
    headerRowIndex,
  };
}

export function changeSpreadsheetSheet(
  workbookBuffer: ArrayBuffer,
  sheetName: string
): { headers: string[]; rawRows: Record<string, any>[] } {
  const workbook = XLSX_READER.read(workbookBuffer, { type: 'array' });
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return { headers: [], rawRows: [] };

  const { headers, rawRows } = extractHeadersAndRows(worksheet);
  return { headers, rawRows };
}

/**
 * Checks whether a column contains barcode/EAN-like numbers (e.g. 8905000083746)
 */
function isNumericBarcodeSample(rawRows: Record<string, any>[], colName: string): boolean {
  if (!colName || rawRows.length === 0) return false;
  let matches = 0;
  const sampleCount = Math.min(20, rawRows.length);
  for (let i = 0; i < sampleCount; i++) {
    const rawVal = rawRows[i]?.[colName];
    if (rawVal === undefined || rawVal === null) continue;
    const val = String(rawVal).trim().replace(/\.0+$/, '');
    // 8 to 16 digit numbers typical for EAN/Barcodes, or large numbers
    if (/^\d{8,16}$/.test(val) || (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(val))) {
      matches++;
    }
  }
  return matches >= 1;
}

/**
 * Strict auto-detection:
 * EAN MUST NEVER BE STORENAME!
 * Store name is detected into its own separate field.
 */
export function autoDetectColumns(
  wondersoftHeaders: string[],
  ecommerceHeaders: string[],
  wondersoftRows: Record<string, any>[] = [],
  ecommerceRows: Record<string, any>[] = []
): ColumnMapping {
  // 1. Separate Store Name detection first
  const wsStore =
    findHeader(wondersoftHeaders, ['storename', 'store name', 'store', 'branch', 'shop']) || '';

  const ecomStore =
    findHeader(ecommerceHeaders, ['storename', 'store name', 'store', 'branch', 'shop']) || '';

  // 2. Strict EAN detection (EXCLUDE any column matching store or branch or name or stock)
  const isExcludedFromEan = (h: string) =>
    /store|branch|shop|name|product|label|size|sixe|colour|color|style|qty|stock|rate|mrp|price|amount/i.test(
      h
    );

  // E-Commerce EAN candidates
  const ecomEanCandidates = ecommerceHeaders.filter((h) => !isExcludedFromEan(h));
  let ecomEan =
    findHeader(ecommerceHeaders, ['ean', 'eancode', 'ean code', 'barcode', 'bar code']) ||
    ecomEanCandidates.find((h) => isNumericBarcodeSample(ecommerceRows, h)) ||
    findHeader(ecommerceHeaders, ['item code', 'sku', 'code']) ||
    ecommerceHeaders.find((h) => /^ean$/i.test(h)) ||
    '';

  // Wondersoft EAN / Barcode candidates
  const wsEanCandidates = wondersoftHeaders.filter((h) => !isExcludedFromEan(h));
  let wsEan =
    findHeader(wondersoftHeaders, ['barcode', 'bar code', 'ean', 'eancode', 'ean code']) ||
    wsEanCandidates.find((h) => isNumericBarcodeSample(wondersoftRows, h)) ||
    findHeader(wondersoftHeaders, ['item code', 'itemcode', 'item_code', 'article no', 'sku', 'code']) ||
    wondersoftHeaders.find((h) => /^ean$/i.test(h)) ||
    '';

  // Safety fallback if no candidate matched
  if (!ecomEan) {
    const nonStore = ecommerceHeaders.filter((h) => !/store|branch/i.test(h));
    ecomEan = nonStore.find((h) => /ean/i.test(h)) || nonStore[1] || nonStore[0] || '';
  }
  if (!wsEan) {
    const nonStore = wondersoftHeaders.filter((h) => !/store|branch/i.test(h));
    wsEan = nonStore.find((h) => /barcode|ean/i.test(h)) || nonStore[1] || nonStore[0] || '';
  }

  // 3. Stock quantities
  // STRICT RULE: Reject Op.Qty, Sale.Qty, Pur.Qty, Adj.Qty, Return Qty!
  // Closing stock (Cl.Qty / Closing Stock) is the true ERP stock!
  const isInvalidStockHeader = (h: string) =>
    /op\.?qty|opening|pur\.?qty|purchase|sale\.?qty|sales|adj\.?qty|adjust|ret\.?qty|return/i.test(h);

  const cleanWsStockHeaders = wondersoftHeaders.filter((h) => !isInvalidStockHeader(h));

  const wsStock =
    findHeader(cleanWsStockHeaders, [
      'cl.qty',
      'cl. stock',
      'cl stock',
      'clqty',
      'clstock',
      'closing stock',
      'closing qty',
      'closing',
      'closing_stock',
      'closing_qty',
      'bal.qty',
      'balance qty',
      'bal qty',
      'balance',
      'current stock',
      'physical stock',
      'stock',
      'qty',
    ]) || cleanWsStockHeaders.find((h) => /closing|cl\.?qty|stock|balance/i.test(h)) || '';

  const ecomStock =
    findHeader(ecommerceHeaders, [
      'total stock qnatity',
      'total stock quantity',
      'total stock',
      'stock quantity',
      'stock',
      'qty',
      'quantity',
      'available',
      'inventory',
    ]) ||
    ecommerceHeaders.find((h) => /^stock$/i.test(h)) ||
    '';

  // 4. E-Commerce specific details
  const ecomName =
    findHeader(ecommerceHeaders, [
      'productname',
      'product name',
      'item name',
      'item_name',
      'description',
      'desc',
      'title',
    ]) || '';

  const wsName =
    findHeader(wondersoftHeaders, [
      'item name',
      'item_name',
      'product name',
      'description',
      'item desc',
      'desc',
    ]) || '';

  const ecomMainCategory =
    findHeader(ecommerceHeaders, [
      'main category',
      'maincategory',
      'main_category',
      'category',
      'parent category',
    ]) || '';

  const ecomProductType =
    findHeader(ecommerceHeaders, [
      'product type',
      'producttype',
      'product_type',
      'type',
      'sub category',
      'subtype',
    ]) || '';

  const ecomStyleNo =
    findHeader(ecommerceHeaders, ['style no', 'styleno', 'style_no', 'style', 'item no']) || '';

  const ecomSize =
    findHeader(ecommerceHeaders, ['size', 'sixe', 'item size', 'variant']) || '';

  const ecomToonLabel =
    findHeader(ecommerceHeaders, ['toon label', 'toonlabel', 'town label', 'label']) || '';

  const ecomColor =
    findHeader(ecommerceHeaders, ['colour', 'color', 'shade']) || '';

  const ecomColumnExtra =
    findHeader(ecommerceHeaders, ['column', 'col', 'category']) || '';

  return {
    skuColumn: ecomEan || wsEan,
    nameColumn: ecomName || wsName,
    wondersoftQtyColumn: wsStock,
    ecommerceQtyColumn: ecomStock,
    mainCategoryColumn: ecomMainCategory,
    productTypeColumn: ecomProductType,
    wondersoftStoreNameColumn: wsStore,
    ecommerceStoreNameColumn: ecomStore,
    storeNameColumn: ecomStore,
    styleNoColumn: ecomStyleNo,
    sizeColumn: ecomSize,
    toonLabelColumn: ecomToonLabel,
    colorColumn: ecomColor,
    columnExtraColumn: ecomColumnExtra,
    storeComparisonMode: 'all',
  };
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const cleanList = headers.map((h) => ({
    original: h,
    lower: h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim(),
  }));

  for (const cand of candidates) {
    const cLower = cand.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const exact = cleanList.find((item) => item.lower === cLower);
    if (exact) return exact.original;
  }

  for (const cand of candidates) {
    const cLower = cand.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const partial = cleanList.find((item) => item.lower.includes(cLower) || cLower.includes(item.lower));
    if (partial) return partial.original;
  }

  return null;
}

export function normalizeIdentifier(val: any): string {
  if (val === undefined || val === null) return '';
  let str = '';
  if (typeof val === 'number') {
    if (Number.isFinite(val) && Math.floor(val) === val) {
      try {
        str = BigInt(val).toString();
      } catch {
        str = val.toLocaleString('fullwide', { useGrouping: false });
      }
    } else {
      str = String(val);
    }
  } else {
    str = String(val);
  }

  str = str.trim();
  // Strip trailing .0, .00
  str = str.replace(/\.0+$/, '');

  // Handle scientific notation e.g. 8.905612345678e+12
  if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      try {
        str = BigInt(Math.round(num)).toString();
      } catch {
        str = num.toLocaleString('fullwide', { useGrouping: false });
      }
    }
  }

  return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Extracts list of distinct store names from rows
 */
export function extractUniqueStores(rows: Record<string, any>[], storeCol?: string): string[] {
  if (!storeCol) return [];
  const set = new Set<string>();
  for (const row of rows) {
    const val = String(row[storeCol] ?? '').trim();
    if (val) set.add(val);
  }
  return Array.from(set).sort();
}

/**
 * Core Stock Comparison Engine
 * Self-healing column matching and robust EAN lookup:
 * - Checks if the selected Wondersoft EAN matches E-Commerce EANs. If not, auto-detects the real barcode column!
 * - Checks if Wondersoft stock column is valid. If 0 across all rows, auto-detects the real Closing Stock column!
 * - Matches by exact EAN and leading-zero normalized EAN.
 */
export function compareStockData(
  wondersoftRows: Record<string, any>[],
  ecommerceRows: Record<string, any>[],
  mapping: {
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
    styleNoCol?: string;
    sizeCol?: string;
    storeNameCol?: string;
    toonLabelCol?: string;
    colorCol?: string;
    columnExtraCol?: string;
    storeComparisonMode?: 'all' | 'exact_store' | 'filter_store';
    selectedStore?: string;
  }
): { items: ComparisonItem[]; summary: ComparisonSummary } {
  const availableStoresSet = new Set<string>();

  // 1. SELF-HEALING: Verify Wondersoft EAN column has matches against E-Commerce EANs
  const wsHeaders = wondersoftRows.length > 0 ? Object.keys(wondersoftRows[0]) : [];
  const sampleEcomEans = ecommerceRows
    .map((r) => normalizeIdentifier(r[mapping.ecommerceSkuCol]))
    .filter(Boolean);

  let effectiveWsSkuCol = mapping.wondersoftSkuCol;

  const countEanMatches = (col: string) => {
    if (!col) return 0;
    let count = 0;
    const testSet = new Set<string>();
    for (const r of wondersoftRows) {
      const id = normalizeIdentifier(r[col]);
      if (id) {
        testSet.add(id);
        testSet.add(id.replace(/^0+/, ''));
      }
    }
    for (const e of sampleEcomEans) {
      if (testSet.has(e) || testSet.has(e.replace(/^0+/, '')) || testSet.has('0' + e)) {
        count++;
      }
    }
    return count;
  };

  const initialMatches = countEanMatches(effectiveWsSkuCol);

  // If initial column has 0 matches, search ALL columns in Wondersoft to find the real barcode column
  if (initialMatches === 0 && sampleEcomEans.length > 0) {
    let bestCol = effectiveWsSkuCol;
    let maxMatches = 0;
    for (const h of wsHeaders) {
      if (/store|branch|shop|name|desc|qty|stock|color|size|mrp|rate/i.test(h)) continue;
      const m = countEanMatches(h);
      if (m > maxMatches) {
        maxMatches = m;
        bestCol = h;
      }
    }
    if (maxMatches > 0) {
      effectiveWsSkuCol = bestCol;
    }
  }

  // 2. SELF-HEALING: Verify Wondersoft Stock column
  // If selected stock column is Op.Qty, Sale.Qty or yields 0 everywhere, find the true Closing Stock!
  let effectiveWsQtyCol = mapping.wondersoftQtyCol;
  const isInvalidQty = (col: string) =>
    /op\.?qty|opening|pur\.?qty|purchase|sale\.?qty|sales|ret\.?qty|return|adj\.?qty|adjust/i.test(col);

  let hasNonZeroStock = false;
  if (effectiveWsQtyCol && !isInvalidQty(effectiveWsQtyCol)) {
    for (const r of wondersoftRows) {
      if (parseNumber(r[effectiveWsQtyCol]) > 0) {
        hasNonZeroStock = true;
        break;
      }
    }
  }

  if (!hasNonZeroStock) {
    const stockCandidates = [
      'cl.qty',
      'cl. stock',
      'cl stock',
      'clqty',
      'clstock',
      'closing stock',
      'closing qty',
      'closing',
      'closing_stock',
      'closing_qty',
      'bal.qty',
      'balance qty',
      'bal qty',
      'balance',
      'current stock',
      'physical stock',
      'stock',
      'qty',
    ];

    for (const cand of stockCandidates) {
      const found = wsHeaders.find((h) => {
        const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return (cleanH === cleanCand || cleanH.includes(cleanCand)) && !isInvalidQty(h);
      });
      if (found) {
        const checkPositive = wondersoftRows.some((r) => parseNumber(r[found]) > 0);
        if (checkPositive) {
          effectiveWsQtyCol = found;
          break;
        }
      }
    }
  }

  // Build Wondersoft lookup maps:
  // 1. By EAN only (multi-indexed for leading zeroes & string variations)
  // 2. By StoreName + EAN (for exact store matching)
  const wsByEan = new Map<
    string,
    { row: Record<string, any>; sku: string; name: string; qty: number; storeName: string }
  >();
  const wsByStoreAndEan = new Map<
    string,
    { row: Record<string, any>; sku: string; name: string; qty: number; storeName: string }
  >();

  for (const row of wondersoftRows) {
    const rawSku = row[effectiveWsSkuCol];
    if (rawSku === undefined || rawSku === null || String(rawSku).trim() === '') continue;

    const skuStr = String(rawSku).trim();
    const normSku = normalizeIdentifier(skuStr);
    const strippedZeroSku = normSku.replace(/^0+/, '');
    const nameStr = String(row[mapping.wondersoftNameCol] || '').trim();
    const qtyVal = parseNumber(row[effectiveWsQtyCol]);
    const storeName = mapping.wondersoftStoreNameCol
      ? String(row[mapping.wondersoftStoreNameCol] || '').trim()
      : '';

    if (storeName) availableStoresSet.add(storeName);

    const existingEntry = wsByEan.get(normSku);
    if (existingEntry) {
      existingEntry.qty += qtyVal;
    } else {
      const entry = { row, sku: skuStr, name: nameStr, qty: qtyVal, storeName };

      if (normSku) {
        wsByEan.set(normSku, entry);
      }
      if (strippedZeroSku && !wsByEan.has(strippedZeroSku)) {
        wsByEan.set(strippedZeroSku, entry);
      }
      if (/^\d+$/.test(normSku)) {
        const p1 = '0' + normSku;
        const p2 = '00' + normSku;
        if (!wsByEan.has(p1)) wsByEan.set(p1, entry);
        if (!wsByEan.has(p2)) wsByEan.set(p2, entry);
      }
    }

    if (storeName && normSku) {
      const storeKey = `${storeName.toLowerCase()}:::${normSku}`;
      const existingStoreEntry = wsByStoreAndEan.get(storeKey);
      if (existingStoreEntry) {
        existingStoreEntry.qty += qtyVal;
      } else {
        const storeEntry = { row, sku: skuStr, name: nameStr, qty: qtyVal, storeName };
        wsByStoreAndEan.set(storeKey, storeEntry);
        if (strippedZeroSku && !wsByStoreAndEan.has(`${storeName.toLowerCase()}:::${strippedZeroSku}`)) {
          wsByStoreAndEan.set(`${storeName.toLowerCase()}:::${strippedZeroSku}`, storeEntry);
        }
      }
    }
  }

  const comparisonItems: ComparisonItem[] = [];

  let stockDecreasedCount = 0;
  let outOfStockCount = 0;
  let inSyncCount = 0;
  let stockIncreasedCount = 0;
  let onlyInWondersoftCount = 0;
  let onlyInEcommerceCount = 0;
  let totalUnitsDecreased = 0;

  let idx = 0;
  for (const row of ecommerceRows) {
    idx++;

    // Extract exact user fields
    const rawEan = row[mapping.ecommerceSkuCol];
    const eanStr = rawEan !== undefined && rawEan !== null ? String(rawEan).trim() : '';
    const normEan = normalizeIdentifier(eanStr);

    const storeName = mapping.ecommerceStoreNameCol || mapping.storeNameCol
      ? String(row[mapping.ecommerceStoreNameCol || mapping.storeNameCol || ''] || '').trim()
      : '';
    if (storeName) availableStoresSet.add(storeName);

    // Apply store filter if selected
    if (
      mapping.storeComparisonMode === 'filter_store' &&
      mapping.selectedStore &&
      mapping.selectedStore !== 'all' &&
      storeName.toLowerCase() !== mapping.selectedStore.toLowerCase()
    ) {
      continue;
    }

    const productName = mapping.ecommerceNameCol
      ? String(row[mapping.ecommerceNameCol] || '').trim()
      : '';
    const mainCategory = mapping.mainCategoryCol
      ? String(row[mapping.mainCategoryCol] || '').trim()
      : '';
    const productType = mapping.productTypeCol
      ? String(row[mapping.productTypeCol] || '').trim()
      : '';
    const toonLabel = mapping.toonLabelCol ? String(row[mapping.toonLabelCol] || '').trim() : '';
    const color = mapping.colorCol ? String(row[mapping.colorCol] || '').trim() : '';
    const size = mapping.sizeCol ? String(row[mapping.sizeCol] || '').trim() : '';
    const columnExtra = mapping.columnExtraCol
      ? String(row[mapping.columnExtraCol] || '').trim()
      : '';
    const styleNo = mapping.styleNoCol ? String(row[mapping.styleNoCol] || '').trim() : '';

    const ecomQty = parseNumber(row[mapping.ecommerceQtyCol]);

    const strippedEan = normEan.replace(/^0+/, '');

    // Matching logic:
    // If exact_store mode, first try Store + EAN, fallback to EAN
    let matchedWs:
      | { row: Record<string, any>; sku: string; name: string; qty: number; storeName: string }
      | undefined;

    if (mapping.storeComparisonMode === 'exact_store' && storeName) {
      const storeKey = `${storeName.toLowerCase()}:::${normEan}`;
      matchedWs =
        wsByStoreAndEan.get(storeKey) ||
        (strippedEan ? wsByStoreAndEan.get(`${storeName.toLowerCase()}:::${strippedEan}`) : undefined);
    }

    // Match by EAN (with leading zero fallback)
    if (!matchedWs && normEan) {
      matchedWs =
        wsByEan.get(normEan) ||
        (strippedEan ? wsByEan.get(strippedEan) : undefined) ||
        wsByEan.get('0' + normEan) ||
        wsByEan.get('00' + normEan);
    }

    if (matchedWs) {
      const wsQty = matchedWs.qty;
      const diff = wsQty - ecomQty;
      const isOos = wsQty <= 0 && ecomQty > 0;
      const hasDec = wsQty < ecomQty;
      const inSync = wsQty === ecomQty;

      let status: ComparisonItem['status'] = 'in_sync';
      if (isOos) {
        status = 'out_of_stock';
        outOfStockCount++;
        stockDecreasedCount++;
        totalUnitsDecreased += ecomQty - wsQty;
      } else if (hasDec) {
        status = 'stock_decreased';
        stockDecreasedCount++;
        totalUnitsDecreased += ecomQty - wsQty;
      } else if (inSync) {
        status = 'in_sync';
        inSyncCount++;
      } else {
        status = 'stock_increased';
        stockIncreasedCount++;
      }

      comparisonItems.push({
        id: `ecom-${idx}-${normEan}`,
        sku: eanStr || `ITEM-${idx}`,
        ean: eanStr,
        mainCategory,
        productType,
        storeName: storeName || matchedWs.storeName || '',
        name: productName || matchedWs.name || 'Product',
        toonLabel,
        color,
        size,
        columnExtra,
        styleNo,
        wondersoftQty: wsQty,
        ecommerceQty: ecomQty,
        targetQty: wsQty, // set to Wondersoft ERP stock
        difference: diff,
        status,
        hasDecreased: hasDec,
        isOutOfStock: isOos,
        isInSync: inSync,
        sourceWondersoftRow: matchedWs.row,
        sourceEcommerceRow: row,
      });
    } else {
      // EAN not found in Wondersoft file
      onlyInEcommerceCount++;
      const diff = 0 - ecomQty;
      const isOos = ecomQty > 0;

      comparisonItems.push({
        id: `ecom-only-${idx}-${normEan}`,
        sku: eanStr || `ITEM-${idx}`,
        ean: eanStr,
        mainCategory,
        productType,
        storeName,
        name: productName || 'Product',
        toonLabel,
        color,
        size,
        columnExtra,
        styleNo,
        wondersoftQty: 0,
        ecommerceQty: ecomQty,
        targetQty: 0,
        difference: diff,
        status: isOos ? 'out_of_stock' : 'in_sync',
        hasDecreased: ecomQty > 0,
        isOutOfStock: isOos,
        isInSync: ecomQty === 0,
        sourceEcommerceRow: row,
      });

      if (ecomQty > 0) {
        stockDecreasedCount++;
        totalUnitsDecreased += ecomQty;
      }
    }
  }

  return {
    items: comparisonItems,
    summary: {
      totalCompared: comparisonItems.length,
      stockDecreasedCount,
      outOfStockCount,
      inSyncCount,
      stockIncreasedCount,
      onlyInWondersoftCount,
      onlyInEcommerceCount,
      totalUnitsDecreased,
      availableStores: Array.from(availableStoresSet).sort(),
    },
  };
}

export function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

export function formatStatusLabel(status: ComparisonItem['status']): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of Stock';
    case 'stock_decreased':
      return 'Stock Decreased';
    case 'in_sync':
      return 'In Sync';
    case 'stock_increased':
      return 'Stock Increased';
    case 'only_in_wondersoft':
      return 'Only in ERP';
    case 'only_in_ecommerce':
      return 'Only in E-Com';
    default:
      return status;
  }
}

/**
 * Downloads the updated E-Commerce file in original format with COLORED cell highlighting!
 * User requirement:
 * "aprom download panrapa na send panna xl la stock data changes iruntha atha vera colour la denote panni kattu ok va"
 * - All original columns are 100% preserved in exact original order.
 * - Changed stock cells are highlighted in distinct Amber/Yellow (or Red for OOS) so changes immediately stand out!
 */
export function downloadModifiedEcommerceFile({
  originalEcommerceRows,
  ecommerceSkuCol,
  ecommerceQtyCol,
  comparisonItems,
  onlyChanged = false,
  baseName = 'ecommerce_inventory_updated',
}: {
  originalEcommerceRows: Record<string, any>[];
  ecommerceSkuCol: string;
  ecommerceQtyCol: string;
  comparisonItems: ComparisonItem[];
  onlyChanged?: boolean;
  format?: 'xlsx';
  baseName?: string;
}) {
  const lookup = new Map<string, ComparisonItem>();
  for (const item of comparisonItems) {
    if (item.ean) {
      const ne = normalizeIdentifier(item.ean);
      lookup.set(ne, item);
      lookup.set(ne.replace(/^0+/, ''), item);
    }
    const ns = normalizeIdentifier(item.sku);
    lookup.set(ns, item);
    lookup.set(ns.replace(/^0+/, ''), item);
  }

  const originalHeaders =
    originalEcommerceRows.length > 0 ? Object.keys(originalEcommerceRows[0]) : [];

  const stockColIndex = originalHeaders.indexOf(ecommerceQtyCol);

  const updatedRows: Record<string, any>[] = [];
  const rowHighlightIndices: {
    rowIndex: number;
    isOos: boolean;
    isInSync: boolean;
    isChanged: boolean;
  }[] = [];

  for (const originalRow of originalEcommerceRows) {
    const rawEan = originalRow[ecommerceSkuCol];
    const normEan = normalizeIdentifier(rawEan);
    const matched =
      lookup.get(normEan) ||
      lookup.get(normEan.replace(/^0+/, '')) ||
      lookup.get('0' + normEan) ||
      lookup.get('00' + normEan);

    if (matched) {
      const isChanged: boolean = Boolean(
        matched.hasDecreased ||
        matched.isOutOfStock ||
        matched.difference !== 0 ||
        matched.isManuallyEdited
      );

      const isInSync: boolean = matched.difference === 0;

      if (onlyChanged && !isChanged) {
        continue;
      }

      const newRow: Record<string, any> = {};
      for (const col of originalHeaders) {
        newRow[col] = originalRow[col];
      }
      newRow[ecommerceQtyCol] = matched.targetQty;
      updatedRows.push(newRow);

      rowHighlightIndices.push({
        rowIndex: updatedRows.length, // 1-based data row in worksheet
        isOos: matched.targetQty <= 0,
        isInSync,
        isChanged,
      });
    } else {
      if (!onlyChanged) {
        const newRow: Record<string, any> = {};
        for (const col of originalHeaders) {
          newRow[col] = originalRow[col];
        }
        updatedRows.push(newRow);
      }
    }
  }

  const filename = `${baseName}_${onlyChanged ? 'changed_only' : 'updated'}_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;

  const worksheet = XLSX_WRITER.utils.json_to_sheet(updatedRows, { header: originalHeaders });

  // Apply header styling
  for (let c = 0; c < originalHeaders.length; c++) {
    const cellAddress = XLSX_WRITER.utils.encode_cell({ r: 0, c });
    if (worksheet[cellAddress]) {
      const isStockHeader = c === stockColIndex;
      worksheet[cellAddress].s = {
        fill: { fgColor: { rgb: isStockHeader ? '1E40AF' : '1E293B' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'medium', color: { rgb: '0F172A' } },
        },
      };
    }
  }

  // Apply colored highlighting:
  // - Difference 0 (In-Sync): Soft Emerald Green (D1FAE5 / 065F46)
  // - Out of Stock (0): Soft Red (FEE2E2 / B91C1C)
  // - Changed Stock (diff > 0): Soft Yellow (FEF08A / 854D0E)
  for (const info of rowHighlightIndices) {
    const r = info.rowIndex; // row index in sheet (header is row 0)
    if (stockColIndex >= 0) {
      const stockCellAddr = XLSX_WRITER.utils.encode_cell({ r, c: stockColIndex });
      if (worksheet[stockCellAddr]) {
        if (info.isInSync) {
          worksheet[stockCellAddr].s = {
            fill: { fgColor: { rgb: 'D1FAE5' } }, // Soft Emerald Green
            font: {
              color: { rgb: '065F46' }, // Dark Emerald Green
              bold: true,
              sz: 11,
            },
            border: {
              top: { style: 'thin', color: { rgb: '10B981' } },
              bottom: { style: 'thin', color: { rgb: '10B981' } },
              left: { style: 'thin', color: { rgb: '10B981' } },
              right: { style: 'thin', color: { rgb: '10B981' } },
            },
            alignment: { horizontal: 'center' },
          };
        } else if (info.isChanged) {
          worksheet[stockCellAddr].s = {
            fill: { fgColor: { rgb: info.isOos ? 'FEE2E2' : 'FEF08A' } }, // Soft Red or Yellow
            font: {
              color: { rgb: info.isOos ? 'B91C1C' : '854D0E' }, // Dark Red or Dark Amber
              bold: true,
              sz: 11,
            },
            border: {
              top: { style: 'medium', color: { rgb: info.isOos ? 'EF4444' : 'EAB308' } },
              bottom: { style: 'medium', color: { rgb: info.isOos ? 'EF4444' : 'EAB308' } },
              left: { style: 'medium', color: { rgb: info.isOos ? 'EF4444' : 'EAB308' } },
              right: { style: 'medium', color: { rgb: info.isOos ? 'EF4444' : 'EAB308' } },
            },
            alignment: { horizontal: 'center' },
          };
        }
      }
    }
  }

  const workbook = XLSX_WRITER.utils.book_new();
  XLSX_WRITER.utils.book_append_sheet(workbook, worksheet, 'Updated Stock');
  XLSX_WRITER.writeFile(workbook, filename);

  return { rowCount: updatedRows.length, filename };
}

/**
 * Generates an Excel Stock Report matching the user's table view columns:
 * EAN, Product Name, Toon Label, Colour, Size, Column, E-Com Stock, Wondersoft Stock, Difference
 * Status column removed, Difference is positive number, and In-Sync (Difference 0) items highlighted in green!
 */
export function exportChangedStockReport(
  items: ComparisonItem[],
  _ignoredFormat?: any,
  filename?: string,
  options?: { onlyChanged?: boolean }
) {
  const onlyChanged = options?.onlyChanged ?? false;
  const filteredItems = onlyChanged
    ? items.filter(
        (i) => i.hasDecreased || i.isOutOfStock || i.difference !== 0 || i.isManuallyEdited
      )
    : items;

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename =
    filename ||
    (onlyChanged
      ? `Changed_Stock_Report_${dateStr}.xlsx`
      : `Stock_Comparison_Report_${dateStr}.xlsx`);

  // Formatted with exact user columns:
  // Main Category, Product Type, Product Name, EAN, Toon Label, E-Com Stock, Wondersoft Stock, Diff
  const reportRows = filteredItems.map((item) => ({
    'Main Category': item.mainCategory || '',
    'Product Type': item.productType || '',
    'Product Name': item.name || '',
    'EAN': item.ean || item.sku || '',
    'Toon Label': item.toonLabel || '',
    'E-Com Stock': item.ecommerceQty,
    'Wondersoft Stock': item.wondersoftQty,
    'Diff': Math.abs(item.difference),
  }));

  const worksheet = XLSX_WRITER.utils.json_to_sheet(reportRows);

  const headerCols = [
    'Main Category',
    'Product Type',
    'Product Name',
    'EAN',
    'Toon Label',
    'E-Com Stock',
    'Wondersoft Stock',
    'Diff',
  ];

  // Style headers
  for (let c = 0; c < headerCols.length; c++) {
    const addr = XLSX_WRITER.utils.encode_cell({ r: 0, c });
    if (worksheet[addr]) {
      worksheet[addr].s = {
        fill: { fgColor: { rgb: '1E3A8A' } }, // Royal Blue
        font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'medium', color: { rgb: '0F172A' } },
        },
      };
    }
  }

  // Highlight cells with color in Excel:
  // - Difference = 0 (In-Sync): Soft Emerald Green (D1FAE5 / 065F46)
  // - Out of stock (Wondersoft = 0): Soft Red (FEE2E2 / DC2626)
  // - Stock changed (diff > 0): Soft Yellow (FEF08A / 854D0E)
  const diffColIndex = 7; // Diff column (0-indexed: 7)
  const wsStockColIndex = 6; // Wondersoft Stock column (0-indexed: 6)

  for (let r = 0; r < filteredItems.length; r++) {
    const item = filteredItems[r];
    const diffCellAddr = XLSX_WRITER.utils.encode_cell({ r: r + 1, c: diffColIndex });
    const wsStockCellAddr = XLSX_WRITER.utils.encode_cell({ r: r + 1, c: wsStockColIndex });
    const isZeroDiff = item.difference === 0;
    const isOos = item.wondersoftQty <= 0;

    // Highlight Difference cell
    if (worksheet[diffCellAddr]) {
      if (isZeroDiff) {
        worksheet[diffCellAddr].s = {
          fill: { fgColor: { rgb: 'D1FAE5' } }, // Soft green
          font: { color: { rgb: '065F46' }, bold: true, sz: 11 },
          border: {
            top: { style: 'thin', color: { rgb: '10B981' } },
            bottom: { style: 'thin', color: { rgb: '10B981' } },
            left: { style: 'thin', color: { rgb: '10B981' } },
            right: { style: 'thin', color: { rgb: '10B981' } },
          },
          alignment: { horizontal: 'center' },
        };
      } else {
        worksheet[diffCellAddr].s = {
          fill: { fgColor: { rgb: isOos ? 'FEE2E2' : 'FEF08A' } },
          font: { color: { rgb: isOos ? 'DC2626' : '854D0E' }, bold: true, sz: 11 },
          border: {
            top: { style: 'thin', color: { rgb: isOos ? 'EF4444' : 'EAB308' } },
            bottom: { style: 'thin', color: { rgb: isOos ? 'EF4444' : 'EAB308' } },
            left: { style: 'thin', color: { rgb: isOos ? 'EF4444' : 'EAB308' } },
            right: { style: 'thin', color: { rgb: isOos ? 'EF4444' : 'EAB308' } },
          },
          alignment: { horizontal: 'center' },
        };
      }
    }

    // Also highlight stock cell if 0 difference with subtle green indicator
    if (worksheet[wsStockCellAddr] && isZeroDiff) {
      worksheet[wsStockCellAddr].s = {
        fill: { fgColor: { rgb: 'ECFDF5' } },
        font: { color: { rgb: '047857' }, bold: true, sz: 11 },
        alignment: { horizontal: 'center' },
      };
    }
  }

  worksheet['!cols'] = [
    { wch: 20 }, // Main Category
    { wch: 18 }, // Product Type
    { wch: 36 }, // Product Name
    { wch: 18 }, // EAN
    { wch: 14 }, // Toon Label
    { wch: 14 }, // E-Com Stock
    { wch: 18 }, // Wondersoft Stock
    { wch: 12 }, // Diff
  ];

  const workbook = XLSX_WRITER.utils.book_new();
  XLSX_WRITER.utils.book_append_sheet(workbook, worksheet, 'Stock Comparison');
  XLSX_WRITER.writeFile(workbook, finalFilename);

  return { rowCount: filteredItems.length, filename: finalFilename };
}

/**
 * Exports full comparison table to Excel
 */
export function exportComparisonToExcel(items: ComparisonItem[], filename: string): void {
  const exportRows = items.map((item) => ({
    'Store Name': item.storeName || '',
    'EAN': item.ean || item.sku,
    'Product Name': item.name,
    'Toon Label': item.toonLabel || '',
    'Colour': item.color || '',
    'Size': item.size || '',
    'Column': item.columnExtra || '',
    'Wondersoft ERP Stock': item.wondersoftQty,
    'Current Store Stock': item.ecommerceQty,
    'Target Stock': item.targetQty,
    'Difference (Δ)': item.difference,
    'Status': formatStatusLabel(item.status),
  }));

  const worksheet = XLSX_WRITER.utils.json_to_sheet(exportRows);
  const workbook = XLSX_WRITER.utils.book_new();
  XLSX_WRITER.utils.book_append_sheet(workbook, worksheet, 'Stock Comparison');
  XLSX_WRITER.writeFile(workbook, filename);
}
