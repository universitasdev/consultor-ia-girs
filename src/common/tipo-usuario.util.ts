import { TipoUsuario } from '@prisma/client';

/** Tipos con ciclo de prueba gratuita / pago (misma lógica de negocio). */
export function isTipoSuscripcion(
  tipo: TipoUsuario | string | null | undefined,
): boolean {
  return (
    tipo === TipoUsuario.ASESOR_PRIVADO || tipo === TipoUsuario.CIUDADANO
  );
}
