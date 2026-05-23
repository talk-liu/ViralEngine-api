import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiErrorResponseDto } from '../common/dto/api-error.dto';
import { AuthService } from './auth.service';
import {
  AuthTokenResponseDto,
  CaptchaResponseDto,
  UserProfileDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  SendSmsCodeDto,
  SendSmsCodeResponseDto,
} from './dto/send-sms-code.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sms-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '发送注册短信验证码' })
  @ApiOkResponse({ type: SendSmsCodeResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: '手机号已注册' })
  sendSmsCode(@Body() dto: SendSmsCodeDto) {
    return this.authService.sendRegisterSmsCode(dto.phone);
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiCreatedResponse({ type: AuthTokenResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('captcha')
  @ApiOperation({ summary: '获取登录图片验证码' })
  @ApiOkResponse({ type: CaptchaResponseDto })
  getCaptcha() {
    return this.authService.getCaptcha();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiOkResponse({ type: AuthTokenResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }
}
