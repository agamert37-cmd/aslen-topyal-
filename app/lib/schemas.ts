import { z } from 'zod';

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Ürün adı zorunludur"),
  category: z.string().optional(),
  stock: z.number().optional().or(z.string().transform(v => Number(v) || 0)),
  currentStock: z.number().optional().or(z.string().transform(v => Number(v) || 0)),
  current_stock: z.number().optional().or(z.string().transform(v => Number(v) || 0)),
  sellPrice: z.number().optional().or(z.string().transform(v => Number(v) || 0)),
  buyPrice: z.number().optional().or(z.string().transform(v => Number(v) || 0)),
}).catchall(z.any()); // allow other fields for now to avoid breaking existing data

export const baseFisSchema = z.object({
  id: z.string().optional(),
  tarih: z.string().optional(),
  date: z.string().optional(),
  type: z.string().optional(),
}).catchall(z.any());

export const cariSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1, "Firma adı zorunludur"),
  name: z.string().optional(),
}).catchall(z.any());

export function validateDoc<T>(tableName: string, doc: any): T {
  try {
    if (tableName === 'urunler') return productSchema.parse(doc) as unknown as T;
    if (tableName === 'cari_hesaplar') return cariSchema.parse(doc) as unknown as T;
    if (tableName === 'fisler') return baseFisSchema.parse(doc) as unknown as T;
    return doc as T; // fallback
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      console.warn(`[Zod Validation] Table: ${tableName}, Doc ID: ${doc.id} - ${err.issues[0]?.message}`);
      // In a strict setup, we would throw here, but to avoid complete lock-ups on legacy data,
      // we modify default fallback. We can return original doc and let 'strict mode' users know.
      // E.g. we might attach _validationError = true
      doc._validationError = err.issues[0]?.message;
    }
    return doc as T;
  }
}
