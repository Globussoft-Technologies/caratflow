import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @ApiProperty({ example: 'admin@sharmajewellers.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'sharma-jewellers' })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;
}

class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  roleId?: string;
}

class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;
}

class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ required: false, description: 'User ID from the reset link' })
  @IsString()
  @IsOptional()
  uid?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { success: true, data: user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive tokens' })
  async login(@Body() dto: LoginDto) {
    const tokens = await this.authService.login(dto.email, dto.password, dto.tenantSlug);
    return { success: true, data: tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    return { success: true, data: tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email, dto.tenantSlug);
    return { success: true, data: result };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword, dto.uid);
    return { success: true };
  }
}
