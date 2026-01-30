
export interface TableRow {
  id: string;
  sira: number;
  aciklama: string;
  net: number;
  yuvarlanmis: number;
  yuzde: number;
  birimFiyatTutar: number;
  birimFiyatYuvarlanmisTutar: number;
  miktar: number;
  miktarUzerindenTutar: number;
}

export type EditableColumn = 'net' | 'yuzde' | 'miktar' | 'aciklama';
