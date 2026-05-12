// src/admin/dto/dashboard-metrics-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

class UserMetricsDto {
  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 120 })
  active: number;

  @ApiProperty({ example: 30 })
  inactive: number;

  @ApiProperty({ example: 100 })
  verified: number;

  @ApiProperty({ example: 5 })
  admins: number;

  @ApiProperty({
    example: [
      { role: 'USER', count: 100 },
      { role: 'PAID_USER', count: 50 },
    ],
  })
  byRole: any[];

  @ApiProperty({
    example: [
      { estado: 'ACTIVO', count: 80 },
      { estado: 'SUSPENDIDO', count: 10 },
    ],
  })
  byEstadoCuenta: any[];
}

class ChatMetricsDto {
  @ApiProperty({ example: 2500 })
  totalMessages: number;

  @ApiProperty({ example: 450 })
  totalSessions: number;
}

class AnalyticsDto {
  @ApiProperty({ example: { servidoresPublicos: 45, asesoresPrivados: 75 } })
  porTipousuario: any;

  @ApiProperty({ example: 60 })
  cuentasSuscritasActivas: number;

  @ApiProperty({ example: 8 })
  suspensionesRecientes: number;

  @ApiProperty({ example: 10 })
  usuariosNoVerificados: number;

  @ApiProperty({ example: 12 })
  crecimientoHoy: number;

  @ApiProperty({
    example: {
      semanal: { actual: 25, anterior: 20 },
      mensual: { actual: 110, anterior: 95 },
    },
  })
  comparativa: any;

  @ApiProperty({
    example: [
      { etiqueta: 'Semana 5', cantidad: 30 },
      { etiqueta: 'Semana 4', cantidad: 25 },
      { etiqueta: 'Semana 3', cantidad: 40 },
    ],
  })
  graficoCrecimiento: any[];
}

export class DashboardMetricsResponseDto {
  @ApiProperty()
  users: UserMetricsDto;

  @ApiProperty()
  chat: ChatMetricsDto;

  @ApiProperty({ example: { proximosAVencer: [], cantidadVencimientos: 0 } })
  alertas: any;

  @ApiProperty({
    example: [
      {
        email: 'user@example.com',
        tipoUsuario: 'SERVIDOR_PUBLICO',
        estadoCuenta: 'ACTIVO',
      },
    ],
  })
  recentUsers: any[];

  @ApiProperty()
  analytics: AnalyticsDto;
}
