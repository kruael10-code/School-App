'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Grid, 
  Search, 
  ListFilter, 
  RefreshCcw, 
  AlertCircle, 
  ChevronRight, 
  Database, 
  ArrowUpCircle, 
  X, 
  Download, 
  Award, 
  User, 
  FileText, 
  Loader2 
} from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// --- TYPES ---

// Represents a raw row from the CSV where keys are column headers
export interface SheetRow {
  [key: string]: string;
}

export interface DataState {
  rows: SheetRow[];
  headers: string[];
  lastUpdated: Date;
}

export interface StatMetric {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: string;
}

// --- SERVICE LAYER ---

const SHEET_ID = '19jf-Lx9OVRwh7j0ImcHBFG-dv0OBpeYyuoHl9irBWDg';

// Use Google Visualization API endpoint for better CORS handling and reliability
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

/**
 * Parses a CSV string into an array of objects.
 * Handles quoted fields and basic CSV nuances.
 */
const parseCSV = (text: string): { headers: string[], rows: SheetRow[] } => {
  const lines = text.split(/\r\n|\n/);
  const result: SheetRow[] = [];
  
  // Filter empty lines
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  
  if (nonEmptyLines.length === 0) return { headers: [], rows: [] };

  // Robust CSV splitter handling quotes
  const splitLine = (line: string): string[] => {
    const entries: string[] = [];
    let inQuote = false;
    let current = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Check for escaped quote ("")
        if (inQuote && line[i + 1] === '"') {
            current += '"';
            i++; // Skip next quote
        } else {
            inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        entries.push(current); // Don't trim inside values, only headers might need it
        current = '';
      } else {
        current += char;
      }
    }
    entries.push(current);
    return entries.map(e => e.trim().replace(/^"|"$/g, ''));
  };

  const headers = splitLine(nonEmptyLines[0]);

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const currentLine = nonEmptyLines[i];
    if (!currentLine) continue;
    
    const values = splitLine(currentLine);
    const obj: SheetRow = {};
    
    // Map headers to values
    headers.forEach((header, index) => {
      // Clean header name
      const key = header.trim();
      // Basic cleanup of values
      obj[key] = values[index] || '';
    });
    
    result.push(obj);
  }

  return { headers, rows: result };
};

const fetchSheetData = async (): Promise<DataState> => {
  try {
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Check if response is HTML (indicates auth error or wrong ID)
    if (text.trim().startsWith('<!DOCTYPE html') || text.includes('<html')) {
      throw new Error("Access denied or invalid Sheet ID. Please ensure the Google Sheet is 'Published to the Web'.");
    }

    const { headers, rows } = parseCSV(text);
    
    return {
      headers,
      rows,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw error;
  }
};

// --- COMPONENTS ---

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-sky-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
    <p className="text-gray-500 font-medium animate-pulse">Connecting to Google Sheets...</p>
  </div>
);

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4">
            {/* School Logo - Custom Generated O-NET Logo */}
             <div className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 bg-gradient-to-br from-sky-500 to-sky-700 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-sky-500/20 border border-white/20 ring-1 ring-black/5">
              <span className="text-white font-black text-lg sm:text-xl tracking-tight leading-none drop-shadow-sm">O-NET</span>
              <div className="w-8 h-0.5 bg-white/30 rounded-full my-0.5"></div>
              <span className="text-white/90 text-[9px] sm:text-[10px] font-bold tracking-widest">REPORT</span>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-sky-600 tracking-tight leading-none font-sans">โรงเรียนบ้านตะโละ</h1>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">O-NET 67 Report</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-full border border-gray-200/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Online</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors hover:bg-gray-100 rounded-lg">
              <Grid size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string; // e.g., 'bg-blue-50 text-blue-600'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SheetRow | null;
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, data }) => {
  const [isExporting, setIsExporting] = useState(false);

  // Early return if no data or not open
  if (!isOpen || !data) return null;

  // Helper to determine if a value is a score (numeric) for dashboard visualization
  const isNumeric = (val: string) => {
    if (!val) return false;
    const num = parseFloat(val);
    // Check if it's a number, finite, and not just an empty string or whitespace
    return !isNaN(num) && isFinite(num) && val.trim() !== '';
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Determine max score based on column name
  const getMaxScore = (key: string) => {
    if (key.includes('ลำดับ')) return 20;
    return 100;
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-dashboard');
    
    if (element) {
      try {
        // Wait for images/fonts to render fully
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(element, {
          scale: 1.5, // Reduced scale for smaller file size
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Use JPEG format with 0.8 quality to reduce file size
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Handle multi-page if content is very long
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`ONET_Report_67_${new Date().toISOString().slice(0,10)}.pdf`);
      } catch (error) {
        console.error("PDF Generation failed", error);
        alert("เกิดข้อผิดพลาดในการสร้าง PDF: " + (error as Error).message);
      } finally {
        setIsExporting(false);
      }
    }
  };

  // Separate data into potential scores and info
  // Robustly cast entries to avoid TS issues
  const entries = Object.entries(data) as [string, string][];
  
  // Logic: Value is numeric and <= 100 is likely a score (or rank <= 20).
  // Logic: Value > 100 (like ID, Year) or non-numeric is Info.
  const scoreEntries = entries.filter(([_, val]) => isNumeric(val) && parseFloat(val) <= 100);
  const infoEntries = entries.filter(([_, val]) => !isNumeric(val) || parseFloat(val) > 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-800 text-white sticky top-0 z-20 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-sky-400" />
            <span className="font-medium">รายละเอียดผลสอบ (Dashboard)</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-sky-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF'}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-grow bg-slate-50">
            {/* Dashboard Container for PDF capture */}
            <div id="report-dashboard" className="p-8 bg-slate-50 min-h-full">
                
                {/* Header for PDF */}
                <div className="mb-8 text-center border-b border-slate-200 pb-6">
                     <h1 className="text-2xl font-bold text-slate-900">รายงานผลการทดสอบทางการศึกษาระดับชาติขั้นพื้นฐาน (O-NET)</h1>
                     <p className="text-slate-500 mt-1">ชั้นประถมศึกษาปีที่ 6 ปีการศึกษา 2567 | โรงเรียนบ้านตะโละ</p>
                </div>

                {/* Student Info Section */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                        <User className="text-sky-600" size={22} />
                        ข้อมูลส่วนตัวนักเรียน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {infoEntries.map(([key, value]) => (
                            <div key={key} className="flex flex-col border-b border-slate-50 pb-2 last:border-0">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">{key}</span>
                                <span className="text-slate-900 font-semibold text-lg break-words">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scores Section */}
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <Award className="text-amber-500" size={22} />
                        ผลการทดสอบรายวิชา
                    </h3>
                    
                    {scoreEntries.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {scoreEntries.map(([key, value]) => {
                                const rawScore = parseFloat(value);
                                const maxScore = getMaxScore(key);
                                const percentage = (rawScore / maxScore) * 100;
                                
                                // Format to 2 decimal places for scores, but 0 decimal places for 'ลำดับ' (Sequence)
                                const isSequence = key.includes('ลำดับ');
                                const formattedScore = isSequence ? rawScore.toFixed(0) : rawScore.toFixed(2);

                                return (
                                    <div key={key} className={`p-5 rounded-xl border ${getScoreColor(percentage)} bg-white shadow-sm relative overflow-hidden group transition-all`}>
                                        <div className="relative z-10">
                                            <p className="text-sm font-bold opacity-70 mb-2 uppercase tracking-wide truncate" title={key}>{key}</p>
                                            <div className="flex items-end gap-2">
                                                <span className="text-4xl font-black tracking-tight">{formattedScore}</span>
                                                <span className="text-sm opacity-60 font-semibold mb-1.5">/ {maxScore}</span>
                                            </div>
                                            
                                            <div className="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${getProgressBarColor(percentage)} transition-all duration-1000 ease-out`} 
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            ไม่พบข้อมูลคะแนนสอบ
                        </div>
                    )}
                </div>
                
                {/* Footer for PDF */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-400">
                    <div>
                        <p>เอกสารนี้จัดทำโดยระบบรายงานผลออนไลน์</p>
                        <p>วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-medium text-slate-500 text-sm">พัฒนาโดย ฝ่ายวิชาการ โรงเรียนบ้านตะโละ @2568</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

export default function OnetReportPage() {
  const [data, setData] = useState<DataState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSheetData();
      setData(result);
    } catch (err) {
      // Use the specific error message from the service if available to help debugging
      const errorMessage = err instanceof Error ? err.message : "Unable to load data. Please check your internet connection or try again later.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filteredRows = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.toLowerCase().trim();
    
    // If no search term, return empty array to hide results (search-first approach)
    if (!term) return [];

    return data.rows.filter(row => {
      const values = Object.values(row);
      return values.some(val => (val as string).toLowerCase().includes(term));
    });
  }, [data, searchTerm]);

  // Identifying columns for display 
  const columns = useMemo(() => {
    if (!data || data.headers.length === 0) return [];
    return data.headers;
  }, [data]);

  const displayColumns = columns;

  // Helper to format values for the table
  const formatDisplayValue = (key: string, value: string) => {
    const num = parseFloat(value);
    
    // If not a number or empty, return original
    if (isNaN(num) || value.trim() === '') return value;

    // Exception: Sequence/Rank should be integer
    if (key.includes('ลำดับ')) {
      return num.toFixed(0);
    }

    // Exception: IDs, Codes, Years, Rooms etc. should not be formatted as score decimals
    // We look for keywords often found in O-NET data headers
    if (
        key.includes('รหัส') || 
        key.includes('เลข') || 
        key.includes('ปี') || 
        key.includes('ห้อง') || 
        key.includes('ชั้น')
    ) {
        return value;
    }

    // Default behavior for numbers (presumably scores): 2 decimal places
    return num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-lg mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Connection Issue</h3>
              <p className="text-red-500 font-medium mb-6 break-words">{error}</p>
              
              <button 
                onClick={loadData}
                className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
              >
                <RefreshCcw size={20} />
                Retry Connection
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header />
      <DetailModal 
        isOpen={!!selectedRow} 
        onClose={() => setSelectedRow(null)} 
        data={selectedRow} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-grow w-full">
        
        {/* Hero / Search Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 lg:p-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-2xl md:text-4xl font-bold text-sky-600 tracking-tight leading-tight">
              Ordinary National Educational Test : O-NET
            </h2>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto">
              การทดสอบทางการศึกษาระดับชาติขั้นพื้นฐาน ชั้นประถมศึกษาปีที่ 6 ปีการศึกษา 2567
            </p>
            
            <div className="relative shadow-2xl shadow-sky-900/5 rounded-2xl pt-2">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-sky-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-14 pr-4 py-5 bg-white border-0 ring-1 ring-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none text-lg transition-all"
                placeholder="พิมพ์ชื่อ-นามสกุล เพื่อค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Database" 
            value={data?.rows.length || 0} 
            icon={<Database size={24} />} 
            colorClass="bg-blue-50 text-blue-600" 
          />
          <StatCard 
            title="Results Found" 
            value={filteredRows.length} 
            icon={<ListFilter size={24} />} 
            colorClass="bg-amber-50 text-amber-600" 
          />
           <StatCard 
            title="System Status" 
            value="Online" 
            icon={<RefreshCcw size={24} />} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
        </div>

        {/* Data Table Logic */}
        {!searchTerm ? (
           // IDLE STATE: Search term is empty
           <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
             <div className="bg-white p-6 rounded-full shadow-sm border border-slate-100 mb-4">
                <ArrowUpCircle size={48} className="text-slate-300 animate-bounce" />
             </div>
             <h3 className="text-lg font-medium text-slate-600 mb-1">กรุณาพิมพ์ชื่อ-นามสกุล เพื่อค้นหาผลสอบ</h3>
             <p className="text-sm">ระบบจะแสดงข้อมูลเมื่อมีการค้นหาเท่านั้น</p>
           </div>
        ) : (
          // RESULTS STATE
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {displayColumns.map((header, idx) => (
                      <th
                        key={idx}
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, rowIndex) => (
                      <tr 
                        key={rowIndex} 
                        onClick={() => setSelectedRow(row)}
                        className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                      >
                        {displayColumns.map((header, colIndex) => (
                          <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {formatDisplayValue(header, row[header])}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-sky-600 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 p-2 rounded-full transition-colors group-hover:scale-110"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={displayColumns.length + 1} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="h-10 w-10 text-slate-300 mb-3" />
                          <p className="text-lg font-medium text-slate-600">ไม่พบข้อมูลที่ค้นหา</p>
                          <p className="text-sm text-slate-400">กรุณาตรวจสอบตัวสะกดและลองใหม่อีกครั้ง</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                Showing {filteredRows.length} result(s)
              </span>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-medium">พัฒนาโดย ฝ่ายวิชาการ โรงเรียนบ้านตะโละ @2568</p>
        </div>
      </footer>
    </div>
  );
}