import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { EtiquetasService } from './etiquetas.service';
import {
  CreateEtiquetaDto,
  GetEtiquetasQueryDto,
  UpdateEtiquetaDto,
} from './dto/etiquetas.dto';

@ApiTags('Etiquetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('etiquetas')
export class EtiquetasController {
  constructor(private readonly etiquetasService: EtiquetasService) {}

  @Post()
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear etiqueta (Curador)' })
  create(@GetUser() user: User, @Body() dto: CreateEtiquetaDto) {
    return this.etiquetasService.create(user.id, dto);
  }

  @Get()
  @Roles(
    UserRole.CURADOR,
    UserRole.ADMIN,
    UserRole.REVISOR,
    UserRole.ADMIN_VISUALIZADOR,
    UserRole.USER,
    UserRole.PAID_USER,
  )
  @ApiOperation({ summary: 'Listar etiquetas (paginado + búsqueda)' })
  findAll(@Query() query: GetEtiquetasQueryDto) {
    return this.etiquetasService.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.CURADOR,
    UserRole.ADMIN,
    UserRole.REVISOR,
    UserRole.ADMIN_VISUALIZADOR,
    UserRole.USER,
    UserRole.PAID_USER,
  )
  @ApiOperation({ summary: 'Detalle de etiqueta' })
  findOne(@Param('id') id: string) {
    return this.etiquetasService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Editar etiqueta' })
  update(@Param('id') id: string, @Body() dto: UpdateEtiquetaDto) {
    return this.etiquetasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.CURADOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar etiqueta (soft-delete)' })
  remove(@Param('id') id: string) {
    return this.etiquetasService.softDelete(id);
  }
}
