
import * as XLSX from 'xlsx-js-style';
import { TableRow } from '../types';

export const exportToExcel = (rows: TableRow[], totals: { birim: number; miktar: number }) => {
  // We'll prepare an array of arrays for the worksheet
  const wsData: any[][] = [];

  // 1. Header Row
  wsData.push([
    'ÜRÜN AÇIKLAMASI',
    'BİRİM FİYAT',
    'MİKTAR',
    'TOPLAM TUTAR'
  ]);

  // 2. Data Rows
  rows.forEach((row) => {
    wsData.push([
      row.aciklama,
      row.birimFiyatYuvarlanmisTutar,
      row.miktar,
      row.miktarUzerindenTutar,
    ]);
  });

  // 3. Separator
  wsData.push(['', '', '', '']);

  // 4. Totals Headers
  wsData.push([
    '',
    'BİRİM TOPLAM',
    '',
    'GENEL TOPLAM'
  ]);

  // 5. Totals Values
  wsData.push([
    '',
    totals.birim,
    '',
    totals.miktar
  ]);

  // Create worksheet from AoA (Array of Arrays)
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Apply cell formats for numbers
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:D1');

  // Custom number format for TRY: #.##0,00 ₺ (Excel compatible)
  const currencyFormat = '#,##0.00 "₺"';
  const integerFormat = '#,##0';

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellRef];

      if (!cell) continue;

      // Apply Header and Totals styling
      if (R === 0) {
        cell.s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { fgColor: { rgb: "F2F2F2" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      } else if (R === wsData.length - 2 || R === wsData.length - 1) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F2F2F2" } }
        };
      }

      if (cell.v === undefined || cell.v === '') continue;

      // Skip headers for numeric formatting
      if (R === 0) continue;

      if (typeof cell.v === 'number') {
        if (C === 1 || C === 3) {
          // Columns 1 (Birim) and 3 (Toplam) are Currency
          cell.t = 'n';
          cell.z = currencyFormat;
        } else if (C === 2) {
          // Column 2 is Quantity (Integer)
          cell.t = 'n';
          cell.z = integerFormat;
        }
      }
    }
  }

  // Set column widths for a "modern" feel (wide enough for currency)
  worksheet['!cols'] = [
    { wch: 40 }, // Açıklama
    { wch: 30 }, // Birim Fiyat
    { wch: 15 }, // Miktar
    { wch: 25 }, // Toplam Tutar
  ];

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hesaplama');

  // Export to file
  XLSX.writeFile(workbook, 'Hesaplama_Sonuclari.xlsx');
};
