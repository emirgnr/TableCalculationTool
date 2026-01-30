
import { TableRow } from '../types';

export const calculateRow = (
  row: Partial<TableRow> & { id: string; sira: number }
): TableRow => {
  const net = row.net || 0;
  const aciklama = row.aciklama || '';
  const yuzde = row.yuzde ?? 30; // Varsayılan %30
  const miktar = row.miktar ?? 1; // Varsayılan 1

  // Sütun 3: NET değeri yukarı yuvarlanır (Math.ceil)
  const yuvarlanmis = Math.ceil(net);

  // Sütun 5: YUVARLANMIŞ + (YUVARLANMIŞ * YÜZDE)
  const birimFiyatTutar = yuvarlanmis + (yuvarlanmis * (yuzde / 100));

  // Sütun 6: Bir üst sütunun yukarı yuvarlanmış hali (Math.ceil)
  const birimFiyatYuvarlanmisTutar = Math.ceil(birimFiyatTutar);

  // Sütun 8: Miktar üzerinden tutar
  const miktarUzerindenTutar = birimFiyatYuvarlanmisTutar * miktar;

  return {
    ...row,
    aciklama,
    net,
    yuvarlanmis,
    yuzde,
    birimFiyatTutar,
    birimFiyatYuvarlanmisTutar,
    miktar,
    miktarUzerindenTutar,
  } as TableRow;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
