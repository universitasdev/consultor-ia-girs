import { createHash } from 'crypto';
import { MacroTipoDocumento } from '@prisma/client';

export const URBANISMO_ROOT = 'urbanismo';
export const PENDIENTES_FOLDER = 'pendientes';

export const MACRO_SLUGS: Record<MacroTipoDocumento, string> = {
  LEGISLACION: 'legislacion',
  ORDENANZA: 'ordenanzas',
  INSTRUMENTO_INTERNACIONAL: 'instrumentos-internacionales',
  SENTENCIA: 'sentencias',
  SENTENCIA_INTERNACIONAL: 'sentencias-internacionales',
  DOCTRINA: 'doctrina',
};

export function slugForMacro(macro: MacroTipoDocumento): string {
  return MACRO_SLUGS[macro];
}

export function pendientesPath(filename: string): string {
  return `${URBANISMO_ROOT}/${PENDIENTES_FOLDER}/${filename}`;
}

export function publishedPath(macro: MacroTipoDocumento, filename: string): string {
  return `${URBANISMO_ROOT}/${slugForMacro(macro)}/${filename}`;
}

export function sanitizeFilename(originalName: string): string {
  const safe = originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  const hash = createHash('sha256')
    .update(`${originalName}-${Date.now()}`)
    .digest('hex')
    .slice(0, 8);
  const base = safe.endsWith('.pdf') ? safe : `${safe}.pdf`;
  return `${hash}-${base}`;
}
