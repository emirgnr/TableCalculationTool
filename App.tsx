import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Download, Plus, Trash2, ClipboardPaste, Eraser } from 'lucide-react';
import { TableRow, EditableColumn } from './types';
import { calculateRow, formatCurrency } from './utils/calculations';
import { exportToExcel } from './utils/excelExport';
import ConfirmationModal from './components/ConfirmationModal';

const App: React.FC = () => {
  const [rows, setRows] = useState<TableRow[]>([
    calculateRow({ id: crypto.randomUUID(), sira: 1, aciklama: '', net: 0, yuzde: 30, miktar: 1 })
  ]);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        birim: acc.birim + row.birimFiyatYuvarlanmisTutar,
        miktar: acc.miktar + row.miktarUzerindenTutar,
      }),
      { birim: 0, miktar: 0 }
    );
  }, [rows]);

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  useEffect(() => {
    // Scroll when new row is added (rows length increases)
    if (rows.length > 1) {
      scrollToBottom();
    }
  }, [rows.length]);

  const addRow = useCallback(() => {
    setRows((prev) => {
      const nextSira = prev.length + 1;
      const initialYuzde = prev.length > 0 ? prev[0].yuzde : 30;
      return [...prev, calculateRow({ id: crypto.randomUUID(), sira: nextSira, aciklama: '', net: 0, yuzde: initialYuzde, miktar: 1 })];
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const filtered = prev.filter(row => row.id !== id);
      if (filtered.length === 0) {
        return [calculateRow({ id: crypto.randomUUID(), sira: 1, aciklama: '', net: 0, yuzde: 30, miktar: 1 })];
      }
      return filtered.map((row, idx) => calculateRow({ ...row, sira: idx + 1 }));
    });
  }, []);

  const clearAll = useCallback(() => {
    setIsClearModalOpen(true);
  }, []);

  const handleConfirmClear = () => {
    setRows([calculateRow({ id: crypto.randomUUID(), sira: 1, aciklama: '', net: 0, yuzde: 30, miktar: 1 })]);
    setIsClearModalOpen(false);
  };

  const parseInputToNumber = (value: string): number => {
    if (value === undefined || value === null || value === '') return 0;
    let clean = value.toString().trim().replace(/[₺$€\s]/g, '');

    // Support Turkish numeric format: "1.234,56" or "1234,56"
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }

    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const updateCell = useCallback((id: string, column: EditableColumn, rawValue: string) => {
    let value: string | number = rawValue;
    if (column !== 'aciklama') {
      value = parseInputToNumber(rawValue);
    }
    setRows((prev) => prev.map(row =>
      row.id === id ? calculateRow({ ...row, [column]: value }) : row
    ));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const lines = pasteData.trim().split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const target = e.target as HTMLElement;
    const input = target.closest('input');
    if (!input) return;

    const columnType = input.getAttribute('data-column') as EditableColumn;
    const rowElement = input.closest('tr');

    if (!rowElement || !columnType) return;

    const siraCell = rowElement.querySelector('td:first-child');
    if (!siraCell) return;
    const startIdx = parseInt(siraCell.textContent || '1') - 1;

    e.preventDefault();

    setRows((prev) => {
      const updatedRows = [...prev];

      // Determine the target percentage (master percentage) to enforce consistency.
      // Default to the first row's current percentage.
      let masterPercentage = prev.length > 0 ? prev[0].yuzde : 30;

      // If we are pasting into the first row (startIdx === 0), the first line of the paste
      // dictates the new master percentage if it contains a valid percentage value.
      if (startIdx === 0 && lines.length > 0) {
        const firstLineCols = lines[0].split('\t').map(col => col.trim());

        let newPercentageCandidate = masterPercentage;

        if (columnType === 'aciklama') {
          // aciklama, net, yuzde, miktar
          if (firstLineCols.length > 2 && firstLineCols[2] !== '') {
            newPercentageCandidate = parseInputToNumber(firstLineCols[2]);
          }
        } else if (columnType === 'net') {
          // net, yuzde, miktar
          if (firstLineCols.length > 1 && firstLineCols[1] !== '') {
            newPercentageCandidate = parseInputToNumber(firstLineCols[1]);
          }
        } else if (columnType === 'yuzde') {
          // yuzde, miktar
          if (firstLineCols.length > 0 && firstLineCols[0] !== '') {
            newPercentageCandidate = parseInputToNumber(firstLineCols[0]);
          }
        }

        // Update masterPercentage if we found a new value
        masterPercentage = newPercentageCandidate;
      }

      lines.forEach((line, i) => {
        const columns = line.split('\t').map(col => col.trim());
        const targetIdx = startIdx + i;

        let updates: Partial<TableRow> = {};

        // Enforce the master percentage on every row being touched by the paste
        updates.yuzde = masterPercentage;

        if (columnType === 'aciklama') {
          updates.aciklama = columns[0];
          if (columns.length > 1 && columns[1] !== '') updates.net = parseInputToNumber(columns[1]);
          // updates.yuzde is already set to masterPercentage above
          if (columns.length > 3 && columns[3] !== '') updates.miktar = parseInputToNumber(columns[3]);
        } else if (columnType === 'net') {
          updates.net = parseInputToNumber(columns[0]);
          // updates.yuzde is already set to masterPercentage above
          if (columns.length > 2 && columns[2] !== '') updates.miktar = parseInputToNumber(columns[2]);
        } else if (columnType === 'yuzde') {
          // updates.yuzde is already set to masterPercentage above
          if (columns.length > 1 && columns[1] !== '') updates.miktar = parseInputToNumber(columns[1]);
        } else if (columnType === 'miktar') {
          updates.miktar = parseInputToNumber(columns[0]);
        }

        if (updatedRows[targetIdx]) {
          updatedRows[targetIdx] = calculateRow({
            ...updatedRows[targetIdx],
            ...updates,
          });
        } else {
          updatedRows.push(calculateRow({
            id: crypto.randomUUID(),
            sira: updatedRows.length + 1,
            aciklama: updates.aciklama ?? '',
            net: updates.net ?? 0,
            yuzde: updates.yuzde ?? 30, // Fallback, will be overridden by ...updates
            miktar: updates.miktar ?? 1,
            ...updates // Explicitly spread updates to ensure yuzde is correct
          }));
        }
      });

      return updatedRows.map((r, i) => ({ ...r, sira: i + 1 }));
    });
  }, []);

  const handleExport = () => {
    exportToExcel(rows, totals);
  };

  const toDisplayValue = (num: number) => {
    if (num === 0) return '';
    return num.toString().replace('.', ',');
  };

  return (
    <div className="w-full max-w-[98%] mx-auto p-4 md:p-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Hesaplama Tablosu</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Modern ve hızlı hesaplama aracı.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl font-medium transition-all text-sm outline-none focus:outline-none focus:ring-0"
          >
            <Eraser size={18} />
            <span className="hidden md:inline">Temizle</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-xl shadow-zinc-200 active:scale-95 text-sm"
          >
            <Download size={18} />
            Excel İndir
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-zinc-100/50 overflow-hidden ring-1 ring-zinc-900/5" onPaste={handlePaste}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="w-16 px-4 py-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center">No</th>
                <th className="w-64 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider text-left">Ürün Açıklaması</th>
                <th className="w-40 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Net</th>
                <th className="w-32 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Yuvarlanmış</th>
                <th className="w-24 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Yüzde (%)</th>
                <th className="w-56 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Birim Fiyat Tutar</th>
                <th className="w-56 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Birim Fiyat Yuv. Tutar</th>
                <th className="w-24 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Miktar</th>
                <th className="w-56 px-4 py-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Miktar Üzerinden Tutar</th>
                <th className="w-14 px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 group transition-colors">
                  <td className="px-4 py-3 text-sm text-zinc-400 text-center font-medium">
                    {row.sira}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      data-column="aciklama"
                      value={row.aciklama}
                      onChange={(e) => updateCell(row.id, 'aciklama', e.target.value)}
                      placeholder="Ürün adı giriniz..."
                      className="w-full bg-transparent border-b border-transparent focus:border-zinc-800 outline-none px-1 py-1.5 text-sm font-medium text-zinc-700 transition-all placeholder:text-zinc-300 placeholder:font-normal"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <input
                        type="text"
                        data-column="net"
                        value={toDisplayValue(row.net)}
                        onChange={(e) => updateCell(row.id, 'net', e.target.value)}
                        placeholder="0,00"
                        className="w-full bg-transparent border-b border-transparent focus:border-zinc-800 outline-none px-1 py-1.5 text-sm font-medium text-zinc-700 transition-all placeholder:text-zinc-300"
                      />
                      <span className="absolute right-1 top-2 text-[10px] text-zinc-300 font-medium pointer-events-none">₺</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500 font-medium pl-5">
                    {row.yuvarlanmis}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      data-column="yuzde"
                      value={toDisplayValue(row.yuzde)}
                      onChange={(e) => updateCell(row.id, 'yuzde', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-zinc-800 outline-none px-1 py-1.5 text-sm font-medium text-zinc-700 transition-all"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400 font-medium pl-5">
                    {formatCurrency(row.birimFiyatTutar)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-800 font-semibold pl-5">
                    {formatCurrency(row.birimFiyatYuvarlanmisTutar)}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      data-column="miktar"
                      value={toDisplayValue(row.miktar)}
                      onChange={(e) => updateCell(row.id, 'miktar', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-zinc-800 outline-none px-1 py-1.5 text-sm font-medium text-zinc-700 transition-all"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900 font-bold pl-5">
                    {formatCurrency(row.miktarUzerindenTutar)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-zinc-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
                      title="Satırı sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50/80 border-t border-zinc-200">
                <td colSpan={6} className="px-4 py-6 text-right uppercase tracking-wider text-[10px] font-semibold text-zinc-400">Toplam Tutarlar</td>
                <td className="px-4 py-6 text-sm font-bold text-zinc-800 border-l border-zinc-100 pl-5">
                  <div className="text-[10px] text-zinc-400 font-medium uppercase mb-0.5">Birim Toplam</div>
                  {formatCurrency(totals.birim)}
                </td>
                <td className="px-4 py-6 border-l border-zinc-100/50"></td>
                <td className="px-4 py-6 text-sm font-bold bg-zinc-900 text-white">
                  <div className="text-[10px] text-zinc-400 font-medium uppercase mb-0.5">Genel Toplam</div>
                  {formatCurrency(totals.miktar)}
                </td>
                <td className="px-4 py-6 bg-zinc-900"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={addRow}
          className="w-full md:w-auto min-w-[200px] flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm active:scale-95 text-sm group"
        >
          <div className="bg-zinc-100 group-hover:bg-zinc-200 p-1 rounded-full transition-colors">
            <Plus size={16} />
          </div>
          Yeni Satır Ekle
        </button>
      </div>

      <div ref={bottomRef} className="h-4" />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 px-2 text-zinc-400">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"></div>
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase mb-1">Veri Güvenliği</p>
            <p className="text-[11px] leading-relaxed">Verileriniz yerel tarayıcınızda işlenir ve sunucuya gönderilmez. Sayfa yenilendiğinde veriler sıfırlanır.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-zinc-600 uppercase">Kısayollar ve İpuçları</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px]">
              <kbd className="min-w-[40px] px-2 py-1 rounded-md border border-zinc-200 bg-white text-zinc-600 font-bold font-mono text-xs text-center shadow-sm">Tab</kbd>
              <span>Bir sonraki hücreye hızlıca geçiş yapın.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <div className="min-w-[40px] flex justify-center"><ClipboardPaste size={16} className="text-zinc-500" /></div>
              <span>Excel'den kopyaladığınız verileri herhangi bir hücreye tıklayıp <strong>CTRL+V</strong> ile yapıştırabilirsiniz.</span>
            </div>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title="Tüm Satırları Temizle"
        message="Bu işlem tablodaki tüm verileri silecektir. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?"
        confirmText="Temizle"
        cancelText="İptal"
        variant="danger"
      />
    </div>
  );
};

export default App;
