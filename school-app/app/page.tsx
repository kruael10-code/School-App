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
  Loader2,
  GraduationCap
} from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// --- TYPES ---

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
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

const parseCSV = (text: string): { headers: string[], rows: SheetRow[] } => {
  const lines = text.split(/\r\n|\n/);
  const result: SheetRow[] = [];
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  
  if (nonEmptyLines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const entries: string[] = [];
    let inQuote = false;
    let current = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuote && line[i + 1] === '"') {
            current += '"';
            i++; 
        } else {
            inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        entries.push(current); 
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
    
    headers.forEach((header, index) => {
      const key = header.trim();
      obj[key] = values[index] || '';
    });
    
    result.push(obj);
  }

  return { headers, rows: result };
};

const fetchSheetData = async (): Promise<DataState> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE html') || text.includes('<html')) {
      throw new Error("Access denied. Please Publish to Web.");
    }
    const { headers, rows } = parseCSV(text);
    return { headers, rows, lastUpdated: new Date() };
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw error;
  }
};

// --- COMPONENTS ---

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <Loader2 className="h-12 w-12 animate-spin text-sky-600" />
    <p className="text-gray-500 font-medium animate-pulse text-sm">กำลังเชื่อมต่อฐานข้อมูล...</p>
  </div>
);

const Header: React.FC = () => {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 sm:h-20 items-center">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="h-10 w-10 sm:h-14 sm:w-14 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <span className="text-white font-black text-xs sm:text-lg">O-NET</span>
              <div className="w-4 sm:w-8 h-0.5 bg-white/30 rounded-full my-0.5"></div>
              <span className="text-white/90 text-[8px] sm:text-[9px] font-bold">REPORT</span>
            </div>
            <div className="leading-tight">
              <h1 className="text-lg sm:text-2xl font-bold text-sky-600 truncate max-w-[200px] sm:max-w-none">โรงเรียนบ้านตะโละ</h1>
              <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-widest">O-NET 67 Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Online</span>
            </div>
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
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex items-center justify-between sm:block">
    <div>
      <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
    <div className={`p-2 sm:p-3 rounded-lg ${colorClass} shrink-0 ml-4 sm:ml-0 sm:mt-4 sm:w-fit`}>{icon}</div>
  </div>
);

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SheetRow | null;
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, data }) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !data) return null;

  const isNumeric = (val: string) => {
    if (!val) return false;
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && val.trim() !== '';
  };

  const getScoreStyles = (percentage: number) => {
    if (percentage >= 80) return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', bar: '#10b981' };
    if (percentage >= 70) return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', bar: '#3b82f6' };
    if (percentage >= 50) return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', bar: '#f59e0b' };
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', bar: '#ef4444' };
  };

  const getMaxScore = (key: string) => key.includes('ลำดับ') ? 20 : 100;

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    const element = document.getElementById('report-dashboard');
    
    if (element) {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('report-dashboard');
            if (clonedElement) {
                clonedElement.style.backgroundColor = '#ffffff';
                clonedElement.style.color = '#000000';
                clonedElement.style.width = '800px'; 
                clonedElement.style.padding = '40px';
            }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`ONET_Report_${new Date().getTime()}.pdf`);
      } catch (error) {
        console.error("PDF Failed", error);
        alert("ไม่สามารถสร้าง PDF ได้: " + (error as Error).message);
      } finally {
        setIsExporting(false);
      }
    }
  };

  const entries = Object.entries(data) as [string, string][];
  const scoreEntries = entries.filter(([_, val]) => isNumeric(val) && parseFloat(val) <= 100);
  const infoEntries = entries.filter(([_, val]) => !isNumeric(val) || parseFloat(val) > 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        {/* Action Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-800 text-white sticky top-0 z-20 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-sky-400" />
            <span className="font-medium text-sm sm:text-base">รายละเอียดผลสอบ</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-70"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isExporting ? 'สร้าง PDF...' : 'บันทึก PDF'}
            </button>
            <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-grow bg-slate-50">
            {/* PDF CONTENT CONTAINER */}
            <div 
                id="report-dashboard" 
                className="p-6 sm:p-8 min-h-full" 
                style={{ backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'Arial, sans-serif' }}
            >
                <div className="mb-6 sm:mb-8 text-center border-b pb-4 sm:pb-6" style={{ borderColor: '#e2e8f0' }}>
                      <h1 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: '#0f172a' }}>รายงานผลการทดสอบ (O-NET)</h1>
                      <p className="mt-1 text-sm sm:text-base" style={{ color: '#64748b' }}>ปีการศึกษา 2567 | โรงเรียนบ้านตะโละ</p>
                </div>

                {/* Student Info */}
                <div className="rounded-xl p-5 sm:p-6 mb-6 sm:mb-8 border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                    <h3 className="text-base sm:text-lg font-bold pb-3 mb-4 flex items-center gap-2 border-b" style={{ color: '#1e293b', borderColor: '#f1f5f9' }}>
                        <User size={20} style={{ color: '#0284c7' }} />
                        ข้อมูลส่วนตัว
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-x-10 sm:gap-y-6">
                        {infoEntries.map(([key, value]) => (
                            <div key={key} className="flex flex-col border-b pb-2 last:border-0 sm:border-b" style={{ borderColor: '#f8fafc' }}>
                                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>{key}</span>
                                <span className="font-semibold text-base sm:text-lg break-words" style={{ color: '#0f172a' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scores */}
                <div>
                    <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-5 flex items-center gap-2" style={{ color: '#1e293b' }}>
                        <Award size={20} style={{ color: '#f59e0b' }} />
                        ผลการทดสอบรายวิชา
                    </h3>
                    
                    {scoreEntries.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                            {scoreEntries.map(([key, value]) => {
                                const rawScore = parseFloat(value);
                                const maxScore = getMaxScore(key);
                                const percentage = (rawScore / maxScore) * 100;
                                const isSequence = key.includes('ลำดับ');
                                const formattedScore = isSequence ? rawScore.toFixed(0) : rawScore.toFixed(2);
                                const styles = getScoreStyles(percentage);

                                return (
                                    <div 
                                        key={key} 
                                        className="p-4 sm:p-5 rounded-xl border shadow-sm relative overflow-hidden"
                                        style={{ 
                                            backgroundColor: styles.bg, 
                                            borderColor: styles.border,
                                            color: styles.text
                                        }}
                                    >
                                            <div className="relative z-10 flex justify-between items-center sm:block">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-bold opacity-70 mb-1 sm:mb-2 uppercase tracking-wide truncate max-w-[150px]" title={key}>{key}</p>
                                                    <div className="flex items-end gap-2">
                                                        <span className="text-3xl sm:text-4xl font-black tracking-tight">{formattedScore}</span>
                                                        <span className="text-xs sm:text-sm opacity-60 font-semibold mb-1.5">/ {maxScore}</span>
                                                    </div>
                                                </div>
                                                {/* Progress bar specific to mobile/desktop layout adjustments if needed */}
                                            </div>
                                            <div className="mt-3 sm:mt-4 w-full rounded-full h-1.5 sm:h-2 overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                                    <div 
                                                        className="h-full rounded-full" 
                                                        style={{ 
                                                            width: `${Math.min(percentage, 100)}%`,
                                                            backgroundColor: styles.bar 
                                                        }}
                                                    ></div>
                                            </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center rounded-xl border border-dashed" style={{ borderColor: '#cbd5e1', color: '#94a3b8' }}>
                            ไม่พบข้อมูล
                        </div>
                    )}
                </div>
                
                {/* Footer PDF */}
                <div className="mt-8 sm:mt-12 pt-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-end text-[10px] sm:text-xs gap-2" style={{ borderColor: '#e2e8f0', color: '#94a3b8' }}>
                    <div>
                        <p>เอกสารนี้จัดทำโดยระบบรายงานผลออนไลน์</p>
                        <p>วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="font-medium" style={{ color: '#64748b' }}>โรงเรียนบ้านตะโละ</p>
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
      const errorMessage = err instanceof Error ? err.message : "Connection Failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];

    return data.rows.filter(row => {
      const values = Object.values(row);
      return values.some(val => (val as string).toLowerCase().includes(term));
    });
  }, [data, searchTerm]);

  const columns = useMemo(() => {
    if (!data || data.headers.length === 0) return [];
    return data.headers;
  }, [data]);

  const formatDisplayValue = (key: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || value.trim() === '') return value;
    if (key.includes('ลำดับ')) return num.toFixed(0);
    if (key.includes('รหัส') || key.includes('เลข') || key.includes('ปี') || key.includes('ห้อง')) return value;
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
          <div className="max-w-lg mx-auto bg-white shadow-xl rounded-2xl overflow-hidden p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">มีปัญหาในการเชื่อมต่อ</h3>
            <p className="text-red-500 font-medium mb-6 text-sm">{error}</p>
            <button onClick={loadData} className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 shadow-lg">
              <RefreshCcw size={20} /> ลองใหม่อีกครั้ง
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col pb-10">
      <Header />
      <DetailModal 
        isOpen={!!selectedRow} 
        onClose={() => setSelectedRow(null)} 
        data={selectedRow} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-grow w-full">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
            <h2 className="text-xl md:text-4xl font-bold text-sky-600 tracking-tight">
              O-NET Result 2567
            </h2>
            <p className="text-slate-500 text-sm md:text-lg max-w-2xl mx-auto">
              ระบบตรวจสอบผลคะแนนสอบ O-NET ชั้นประถมศึกษาปีที่ 6
            </p>
            
            <div className="relative shadow-xl shadow-sky-900/5 rounded-xl sm:rounded-2xl pt-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-sky-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 bg-white border-0 ring-1 ring-slate-200 rounded-xl sm:rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none text-base sm:text-lg transition-all"
                placeholder="พิมพ์ชื่อ หรือ นามสกุล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
          <div className="col-span-2 md:col-span-1">
             <StatCard title="ทั้งหมด" value={data?.rows.length || 0} icon={<Database size={20} />} colorClass="bg-blue-50 text-blue-600" />
          </div>
          <StatCard title="พบข้อมูล" value={filteredRows.length} icon={<ListFilter size={20} />} colorClass="bg-amber-50 text-amber-600" />
          <StatCard title="สถานะ" value="Online" icon={<RefreshCcw size={20} />} colorClass="bg-emerald-50 text-emerald-600" />
        </div>

        {!searchTerm ? (
           <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
             <div className="bg-white p-4 sm:p-6 rounded-full shadow-sm border border-slate-100 mb-4">
                <ArrowUpCircle size={32} className="text-slate-300 animate-bounce sm:w-12 sm:h-12" />
             </div>
             <h3 className="text-base sm:text-lg font-medium text-slate-600 mb-1">พิมพ์ชื่อเพื่อค้นหา</h3>
             <p className="text-xs sm:text-sm">ระบบจะแสดงข้อมูลเมื่อมีการค้นหาเท่านั้น</p>
           </div>
        ) : (
          <>
          {/* --- DESKTOP VIEW (TABLE) --- */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((header, idx) => (
                      <th key={idx} scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, rowIndex) => (
                      <tr key={rowIndex} onClick={() => setSelectedRow(row)} className="hover:bg-sky-50/50 transition-colors cursor-pointer group">
                        {columns.map((header, colIndex) => (
                          <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {formatDisplayValue(header, row[header])}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-sky-600 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 p-2 rounded-full transition-colors group-hover:scale-110">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-500">
                        ไม่พบข้อมูลที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="md:hidden space-y-4">
             {filteredRows.length > 0 ? (
                filteredRows.map((row, rowIndex) => {
                  // Try to find intelligent display fields for the card
                  const nameField = columns.find(c => c.includes('ชื่อ') || c.includes('name')) || columns[0];
                  const idField = columns.find(c => c.includes('เลข') || c.includes('ID')) || columns[1];
                  
                  return (
                    <div 
                      key={rowIndex} 
                      onClick={() => setSelectedRow(row)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                           <GraduationCap size={60} className="text-sky-600" />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="mb-3">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">{idField}: {row[idField]}</p>
                            <h3 className="text-lg font-bold text-slate-800">{row[nameField]}</h3>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                             <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">คลิกเพื่อดูผลสอบ</span>
                             <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                                <ChevronRight size={18} />
                             </div>
                          </div>
                        </div>
                    </div>
                  );
                })
             ) : (
                <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-dashed border-slate-200">
                   <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                   <p>ไม่พบข้อมูล</p>
                </div>
             )}
          </div>
          </>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-xs font-medium">พัฒนาโดย ฝ่ายวิชาการ โรงเรียนบ้านตะโละ</p>
        </div>
      </footer>
    </div>
  );
}