import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EstadoCuenta, User } from '@prisma/client';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const user = request.user as User | undefined;

    // Si no hay usuario en la request, denegamos el acceso (probablemente falta JwtAuthGuard)
    if (!user) {
      return false;
    }

    // Permitimos administradores siempre
    if (user.role === 'ADMIN') {
      return true;
    }

    // De acuerdo a la lógica definida, las restricciones activas (Tag bloqueante aplicado por Cron/Admin)
    if (
      user.estadoCuenta === EstadoCuenta.SUSPENDIDO ||
      user.estadoCuenta === EstadoCuenta.POR_PAGAR
    ) {
      const isPublicServant = user.tipoUsuario === 'SERVIDOR_PUBLICO';
      const message = isPublicServant
        ? 'Acceso denegado: Su cuenta ha sido suspendida. Por favor, comuníquese con el administrador o regularice su documentación.'
        : 'Acceso denegado: Su prueba gratuita ha caducado. Por favor, realice el pago correspondiente para continuar utilizando el servicio.';

      throw new ForbiddenException(message);
    }

    // Permitimos el acceso para cuentas PRUEBA_GRATUITA, ACTIVO, POR_RENOVAR y usuarios antiguos sin estadoCuenta restrictivo.
    return true;
  }
}
