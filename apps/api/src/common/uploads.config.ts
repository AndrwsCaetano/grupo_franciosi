import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { diskStorage } from 'multer';

/** Diretório raiz onde os anexos são guardados (fora do bundle, persistente). */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

export const RECEIPTS_SUBDIR = 'fuelings';

export const RECEIPTS_DIR = join(UPLOADS_DIR, RECEIPTS_SUBDIR);

export const ALLOWED_RECEIPT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** Storage configurado para os comprovantes de abastecimento. */
export const receiptDiskStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(RECEIPTS_DIR)) {
      mkdirSync(RECEIPTS_DIR, { recursive: true });
    }
    cb(null, RECEIPTS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = pickExtension(file.originalname, file.mimetype);
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

function pickExtension(originalName: string, mime: string): string {
  const fromName = originalName.includes('.')
    ? `.${originalName.split('.').pop()!.toLowerCase()}`
    : '';
  if (fromName) {
    return fromName;
  }
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return '';
  }
}
