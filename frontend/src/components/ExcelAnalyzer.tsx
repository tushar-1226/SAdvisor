import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, X, ChevronDown } from 'lucide-react';
import ExcelDashboard from './ExcelDashboard';
import './ExcelAnalyzer.css';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;       // data rows (excluding header)
  totalColumns: number;
  totalCells: number;
}

export interface ParsedWorkbook {
  fileName: string;
  fileSize: string;
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetNames = workbook.SheetNames;
        const sheets: Record<string, ParsedSheet> = {};

        sheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];

          // Get the range
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          const totalColumns = range.e.c - range.s.c + 1;

          // Convert to array of arrays (with header)
          const raw: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: null,
            raw: false, // format dates as strings
          });

          const headers: string[] = raw.length > 0
            ? (raw[0] as (string | number | boolean | null)[]).map((h, i) =>
                h != null && String(h).trim() !== '' ? String(h) : `Column ${i + 1}`
              )
            : [];

          const dataRows = raw.slice(1);
          const totalRows = dataRows.length;
          const totalCells = dataRows.reduce(
            (acc, row) => acc + row.filter((c) => c !== null && c !== '').length,
            0
          );

          sheets[sheetName] = {
            name: sheetName,
            headers,
            rows: dataRows,
            totalRows,
            totalColumns,
            totalCells,
          };
        });

        resolve({
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          sheetNames,
          sheets,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export default function ExcelAnalyzer() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetDropdownOpen, setSheetDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExts = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError('Please upload a valid Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setWorkbook(null);

    try {
      const parsed = await parseWorkbook(file);
      setWorkbook(parsed);
      setActiveSheet(parsed.sheetNames[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleReset = () => {
    setWorkbook(null);
    setActiveSheet('');
    setError(null);
  };

  const currentSheet = workbook?.sheets[activeSheet];

  // ── Dashboard view ──
  if (workbook && currentSheet) {
    return (
      <div className="excel-analyzer-root">
        {/* File Info Bar */}
        <div className="excel-file-bar fade-in-up">
          <div className="excel-file-bar-left">
            <div className="excel-file-icon">
              <FileSpreadsheet size={18} />
            </div>
            <div className="excel-file-info">
              <span className="excel-file-name">{workbook.fileName}</span>
              <span className="excel-file-size">{workbook.fileSize}</span>
            </div>

            {/* Sheet Selector */}
            {workbook.sheetNames.length > 1 && (
              <div className="sheet-selector">
                <button
                  className="sheet-selector-btn"
                  onClick={() => setSheetDropdownOpen((o) => !o)}
                  id="sheet-selector-toggle"
                >
                  {activeSheet}
                  <ChevronDown
                    size={14}
                    style={{
                      transform: sheetDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}
                  />
                </button>
                {sheetDropdownOpen && (
                  <div className="sheet-dropdown">
                    {workbook.sheetNames.map((name) => (
                      <button
                        key={name}
                        className={`sheet-dropdown-item ${name === activeSheet ? 'sheet-dropdown-item--active' : ''}`}
                        onClick={() => {
                          setActiveSheet(name);
                          setSheetDropdownOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="excel-reset-btn" onClick={handleReset} title="Upload a new file" id="upload-new-file-btn">
            <X size={14} /> New File
          </button>
        </div>

        {/* Main Dashboard */}
        <ExcelDashboard sheet={currentSheet} />
      </div>
    );
  }

  // ── Upload view ──
  return (
    <div className="excel-analyzer-root">
      <div className="upload-section fade-in-up">
        <div className="upload-section-header">
          <h2 className="upload-section-title">Excel Data Analyzer</h2>
          <p className="upload-section-subtitle">
            Upload any Excel or CSV file to explore your data with instant analytics, smart charts, and a searchable table view.
          </p>
        </div>

        <div
          className={`dropzone ${isDragging ? 'dropzone--dragging' : ''} ${isProcessing ? 'dropzone--processing' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop Excel file or click to browse"
          id="excel-dropzone"
          onKeyDown={(e) => e.key === 'Enter' && !isProcessing && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            id="excel-file-input"
          />

          {isProcessing ? (
            <div className="dropzone-processing">
              <div className="dropzone-spinner" />
              <span className="dropzone-processing-text">Parsing your file…</span>
            </div>
          ) : (
            <>
              <div className={`dropzone-icon-wrapper ${isDragging ? 'dropzone-icon-wrapper--dragging' : ''}`}>
                <UploadCloud size={36} />
              </div>
              <p className="dropzone-title">
                {isDragging ? 'Release to analyze' : 'Drag & drop your file here'}
              </p>
              <p className="dropzone-subtitle">or click to browse</p>
              <div className="dropzone-supported">
                <span className="dropzone-pill">.xlsx</span>
                <span className="dropzone-pill">.xls</span>
                <span className="dropzone-pill">.csv</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="upload-error" role="alert">
            <X size={14} /> {error}
          </div>
        )}

        <div className="upload-features">
          {[
            { icon: '🔒', label: 'Private', desc: 'All processing happens in-browser. Nothing is sent to any server.' },
            { icon: '⚡', label: 'Instant', desc: 'Charts and stats appear as soon as the file loads.' },
            { icon: '📊', label: 'Smart Charts', desc: 'Bar, Line, Area, Scatter & Pie with configurable axes.' },
          ].map((f) => (
            <div key={f.label} className="upload-feature-card">
              <span className="upload-feature-icon">{f.icon}</span>
              <span className="upload-feature-label">{f.label}</span>
              <span className="upload-feature-desc">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
