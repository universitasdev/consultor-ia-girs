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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { GetStaffQueryDto } from './dto/get-staff-query.dto';

@ApiTags('Admin Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear usuario Curador o Revisor' })
  @ApiResponse({ status: 201, description: 'Usuario staff creado.' })
  @ApiResponse({ status: 409, description: 'Email ya registrado.' })
  createStaff(@Body() dto: CreateStaffUserDto) {
    return this.adminService.createStaffUser(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar Curadores y Revisores' })
  @ApiResponse({ status: 200, description: 'Lista de staff recuperada.' })
  findAllStaff(@Query() query: GetStaffQueryDto) {
    return this.adminService.findAllStaffUsers(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_VISUALIZADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener Curador o Revisor por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del usuario staff.' })
  @ApiResponse({ status: 404, description: 'Usuario staff no encontrado.' })
  findOneStaff(@Param('id') id: string) {
    return this.adminService.findOneStaffUser(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar Curador o Revisor' })
  @ApiResponse({ status: 200, description: 'Usuario staff actualizado.' })
  @ApiResponse({ status: 404, description: 'Usuario staff no encontrado.' })
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.adminService.updateStaffUser(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar (soft-delete) Curador o Revisor' })
  @ApiResponse({ status: 200, description: 'Usuario staff eliminado.' })
  @ApiResponse({ status: 404, description: 'Usuario staff no encontrado.' })
  deleteStaff(@Param('id') id: string) {
    return this.adminService.deleteStaffUser(id);
  }
}
