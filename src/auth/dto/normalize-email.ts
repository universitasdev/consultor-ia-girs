import { Transform } from 'class-transformer';

/** Normaliza emails: trim + minúsculas (login/registro case-insensitive). */
export function NormalizeEmail() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
