'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  name: string;
  description: string;
  price: string;
  category: string;
  diet: string;
  spicy: string;
  prepMinutes: string;
  isAvailable: string;
  inStock: string;
  isPopular: string;
  isFeatured: string;
  tags: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportWarning {
  row: number;
  message: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const HEADERS = [
  'name',
  'description',
  'price',
  'category',
  'diet',
  'spicy',
  'prepMinutes',
  'isAvailable',
  'inStock',
  'isPopular',
  'isFeatured',
  'tags',
] as const;

function parseCSVClient(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '');
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };
  const [headerLine, ...dataLines] = lines;
  return { headers: parseLine(headerLine), rows: dataLines.map(parseLine) };
}

function rowsToPreview(headers: string[], rows: string[][]): ParsedRow[] {
  const col = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  return rows.map((row, idx) => {
    const get = (name: string) => { const i = col(name); return i >= 0 && i < row.length ? row[i] : ''; };
    return {
      rowNum: idx + 2,
      name: get('name'),
      description: get('description'),
      price: get('price'),
      category: get('category'),
      diet: get('diet'),
      spicy: get('spicy'),
      prepMinutes: get('prepMinutes'),
      isAvailable: get('isAvailable'),
      inStock: get('inStock'),
      isPopular: get('isPopular'),
      isFeatured: get('isFeatured'),
      tags: get('tags'),
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BulkMenuImportProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

export function BulkMenuImport({ onClose, onImported }: BulkMenuImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    loadFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }

  function loadFile(f: File) {
    setResult(null);
    setParseError(null);
    setPreview([]);

    if (!f.name.endsWith('.csv')) {
      setParseError('Only .csv files are accepted.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setParseError('File size exceeds the 5 MB limit.');
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const { headers, rows } = parseCSVClient(text);
        const missing = ['name', 'price', 'category'].filter(
          (h) => !headers.map((x) => x.toLowerCase()).includes(h)
        );
        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }
        if (rows.length === 0) {
          setParseError('The CSV file has no data rows.');
          return;
        }
        setPreview(rowsToPreview(headers, rows));
      } catch {
        setParseError('Failed to parse CSV. Please check the file format.');
      }
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    if (!file || preview.length === 0) return;
    setImporting(true);
    setProgress(10);

    const fd = new FormData();
    fd.append('file', file);

    // Simulate progress ticks while waiting
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 300);

    try {
      const res = await fetch('/api/dashboard/menu/bulk-import', { method: 'POST', body: fd });
      clearInterval(ticker);
      setProgress(100);

      const data: ImportResult = await res.json();

      if (!res.ok) {
        toast.error('Import failed', (data as any).error ?? 'Unknown error');
        setImporting(false);
        return;
      }

      setResult(data);
      if (data.imported > 0) {
        toast.success(`${data.imported} item${data.imported !== 1 ? 's' : ''} imported successfully`);
        onImported(data.imported);
      } else if (data.errors.length > 0) {
        toast.error('Import completed with errors', 'No items were imported.');
      }
    } catch {
      clearInterval(ticker);
      toast.error('Network error', 'Could not reach the server. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setParseError(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-3xl bg-cream-50 rounded-t-3xl md:rounded-3xl max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-coffee-100 flex items-center justify-between sticky top-0 bg-cream-50 z-10">
          <div>
            <h3 className="font-display text-lg font-bold text-coffee-900">Bulk Import Menu Items</h3>
            <p className="text-xs text-coffee-500 mt-0.5">Upload a CSV file to add multiple items at once</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-cream-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-xl border border-coffee-100 bg-cream-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-coffee-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-coffee-900">Download CSV Template</p>
                <p className="text-xs text-coffee-500">Use this template to format your menu data correctly</p>
              </div>
            </div>
            <a href="/menu-import-template.csv" download>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" /> Template
              </Button>
            </a>
          </div>

          {/* File upload area */}
          {!file && (
            <div
              className="rounded-2xl border-2 border-dashed border-coffee-200 bg-white p-8 text-center cursor-pointer hover:border-coffee-400 hover:bg-cream-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="mx-auto h-10 w-10 text-coffee-300 mb-3" />
              <p className="text-sm font-semibold text-coffee-800">Click to upload or drag & drop</p>
              <p className="text-xs text-coffee-500 mt-1">CSV files only · Max 5 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-800">Invalid file</p>
                <p className="text-xs text-rose-700 mt-0.5">{parseError}</p>
              </div>
              <button onClick={reset} className="ml-auto text-rose-400 hover:text-rose-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* File loaded — preview */}
          {file && !parseError && preview.length > 0 && !result && (
            <>
              {/* File info bar */}
              <div className="flex items-center justify-between rounded-xl border border-coffee-100 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-coffee-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-coffee-900">{file.name}</p>
                    <p className="text-xs text-coffee-500">{preview.length} row{preview.length !== 1 ? 's' : ''} detected</p>
                  </div>
                </div>
                <button onClick={reset} className="text-coffee-400 hover:text-coffee-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preview table */}
              <div>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold text-coffee-800 mb-2"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Preview ({preview.length} rows)
                </button>
                {showPreview && (
                  <div className="overflow-x-auto rounded-xl border border-coffee-100">
                    <table className="w-full text-xs">
                      <thead className="bg-coffee-50 text-coffee-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">#</th>
                          <th className="px-3 py-2 text-left font-semibold">Name</th>
                          <th className="px-3 py-2 text-left font-semibold">Category</th>
                          <th className="px-3 py-2 text-left font-semibold">Price</th>
                          <th className="px-3 py-2 text-left font-semibold">Diet</th>
                          <th className="px-3 py-2 text-left font-semibold">Spicy</th>
                          <th className="px-3 py-2 text-left font-semibold">Tags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-coffee-50">
                        {preview.slice(0, 50).map((row) => (
                          <tr key={row.rowNum} className="bg-white hover:bg-cream-50">
                            <td className="px-3 py-2 text-coffee-400">{row.rowNum}</td>
                            <td className="px-3 py-2 font-medium text-coffee-900 max-w-[140px] truncate">{row.name || <span className="text-rose-400 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-coffee-700">{row.category || <span className="text-rose-400 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-coffee-700">{row.price || <span className="text-rose-400 italic">missing</span>}</td>
                            <td className="px-3 py-2 text-coffee-600">{row.diet || 'VEG'}</td>
                            <td className="px-3 py-2 text-coffee-600">{row.spicy || 'NONE'}</td>
                            <td className="px-3 py-2 text-coffee-500 max-w-[120px] truncate">{row.tags}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 50 && (
                      <p className="px-3 py-2 text-xs text-coffee-400 bg-coffee-50 border-t border-coffee-100">
                        Showing first 50 of {preview.length} rows
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {importing && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-coffee-600">
                    <span>Importing…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-coffee-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-coffee-700 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} disabled={importing} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing} className="flex-1">
                  {importing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Import {preview.length} item{preview.length !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                result.imported > 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                {result.imported > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${result.imported > 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {result.imported > 0
                      ? `${result.imported} item${result.imported !== 1 ? 's' : ''} imported successfully`
                      : 'No items were imported'}
                  </p>
                  <p className={`text-xs mt-0.5 ${result.imported > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {result.errors.length > 0 && `${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
                    {result.errors.length > 0 && result.warnings.length > 0 && ' · '}
                    {result.warnings.length > 0 && `${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''}`}
                    {result.errors.length === 0 && result.warnings.length === 0 && 'All rows processed cleanly'}
                  </p>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 text-sm font-semibold text-rose-700 mb-2"
                    onClick={() => setShowErrors((v) => !v)}
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <AlertCircle className="h-4 w-4" />
                    Errors ({result.errors.length})
                  </button>
                  {showErrors && (
                    <div className="rounded-xl border border-rose-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-rose-50 text-rose-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold w-12">Row</th>
                            <th className="px-3 py-2 text-left font-semibold w-24">Field</th>
                            <th className="px-3 py-2 text-left font-semibold">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-50">
                          {result.errors.map((err, i) => (
                            <tr key={i} className="bg-white">
                              <td className="px-3 py-2 text-rose-500 font-mono">{err.row}</td>
                              <td className="px-3 py-2 text-rose-700 font-medium">{err.field}</td>
                              <td className="px-3 py-2 text-coffee-700">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-2"
                    onClick={() => setShowWarnings((v) => !v)}
                  >
                    {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({result.warnings.length})
                  </button>
                  {showWarnings && (
                    <div className="rounded-xl border border-amber-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-50 text-amber-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold w-12">Row</th>
                            <th className="px-3 py-2 text-left font-semibold">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {result.warnings.map((w, i) => (
                            <tr key={i} className="bg-white">
                              <td className="px-3 py-2 text-amber-600 font-mono">{w.row}</td>
                              <td className="px-3 py-2 text-coffee-700">{w.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Actions after result */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={reset} className="flex-1">
                  Import another file
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
