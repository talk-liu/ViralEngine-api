import {
  Body,
  Controller,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../../../common/dto/api-error.dto';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  AdminUserCreatedDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  AdminUserResetPasswordResponseDto,
} from '../dto/admin-user-response.dto';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ListAdminUsersQueryDto } from '../dto/list-admin-users-query.dto';
import { UpdateAdminUserDto } from '../dto/update-admin-user.dto';
import { AdminUserService } from '../services/admin-user.service';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminUsersController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  @ApiOkResponse({ type: AdminUserListResponseDto })
  list(@Query() query: ListAdminUsersQueryDto) {
    return this.adminUserService.list(query);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiCreatedResponse({ type: AdminUserCreatedDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUserService.create(dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: '用户详情' })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getById(@Param('userId') userId: string) {
    return this.adminUserService.getById(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: '编辑用户（到期日、禁用状态）' })
  @ApiOkResponse({ type: AdminUserListItemDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  update(@Param('userId') userId: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminUserService.update(userId, dto);
  }

  @Post(':userId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置用户密码' })
  @ApiOkResponse({ type: AdminUserResetPasswordResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  resetPassword(@Param('userId') userId: string) {
    return this.adminUserService.resetPassword(userId);
  }
}
