import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { B2CAuthService } from './auth.b2c.service';
import { OtpService } from './auth.otp.service';
import { TwoFactorAuthService } from './auth.2fa.service';
import { B2CAuthGuard } from './b2c-auth.guard';
import type { SocialProvider, OtpPurpose } from '@caratflow/db';

// ─── DTOs ─────────────────────────────────────────────────────

class RegisterEmailDto {
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  tenantSlug!: string;
}

class RegisterPhoneDto {
  phone!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  tenantSlug!: string;
}

class LoginEmailDto {
  email!: string;
  password!: string;
  tenantSlug!: string;
  twoFactorCode?: string;
}

class LoginPhoneDto {
  phone!: string;
  tenantSlug!: string;
}

class SocialLoginDto {
  provider!: SocialProvider;
  idToken?: string;
  accessToken?: string;
  tenantSlug!: string;
}

class OtpSendDto {
  identifier!: string;
  purpose!: OtpPurpose;
}

class OtpVerifyDto {
  identifier!: string;
  otp!: string;
  purpose!: OtpPurpose;
  tenantSlug?: string;
}

class RefreshDto {
  refreshToken!: string;
}

class TwoFactorCodeDto {
  code!: string;
}

// ─── Controller ───────────────────────────────────────────────

@ApiTags('b2c-auth')
@Controller('api/v1/b2c/auth')
export class B2CAuthController {
  constructor(
    private readonly b2cAuthService: B2CAuthService,
    private readonly otpService: OtpService,
    private readonly twoFactorService: TwoFactorAuthService,
  ) {}

  // ─── Registration ─────────────────────────────────────────

  @Post('register/email')
  @ApiOperation({ summary: 'Register a new B2C customer with email' })
  async registerWithEmail(@Body() dto: RegisterEmailDto) {
    const result = await this.b2cAuthService.registerWithEmail(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.tenantSlug,
    );
    return { success: true, data: result };
  }

  @Post('register/phone')
  @ApiOperation({ summary: 'Register a new B2C customer with phone number' })
  async registerWithPhone(@Body() dto: RegisterPhoneDto) {
    const result = await this.b2cAuthService.registerWithPhone(
      dto.phone,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.tenantSlug,
    );
    return { success: true, data: result };
  }

  // ─── Login ────────────────────────────────────────────────

  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login B2C customer with email and password' })
  async loginWithEmail(@Body() dto: LoginEmailDto) {
    const result = await this.b2cAuthService.loginWithEmail(
      dto.email,
      dto.password,
      dto.tenantSlug,
      dto.twoFactorCode,
    );
    return { success: true, data: result };
  }

  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login B2C customer with phone (sends OTP)' })
  async loginWithPhone(@Body() dto: LoginPhoneDto) {
    const result = await this.b2cAuthService.loginWithPhoneSendOtp(
      dto.phone,
      dto.tenantSlug,
    );
    return { success: true, data: result };
  }

  @Post('login/social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register B2C customer via social provider' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    const result = await this.b2cAuthService.socialLogin(
      dto.provider,
      dto.idToken,
      dto.accessToken,
      dto.tenantSlug,
    );
    return { success: true, data: result };
  }

  // ─── OTP ──────────────────────────────────────────────────

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone or email' })
  async sendOtp(@Body() dto: OtpSendDto) {
    const result = await this.otpService.generateOtp(dto.identifier, dto.purpose);
    return { success: true, data: result };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and complete phone login if purpose is LOGIN' })
  async verifyOtp(@Body() dto: OtpVerifyDto) {
    // If purpose is LOGIN and tenantSlug is provided, complete the phone login flow
    if (dto.purpose === 'LOGIN' && dto.tenantSlug) {
      const result = await this.b2cAuthService.loginWithPhoneVerifyOtp(
        dto.identifier,
        dto.otp,
        dto.tenantSlug,
      );
      return { success: true, data: result };
    }

    // Otherwise, just verify the OTP
    await this.otpService.verifyOtp(dto.identifier, dto.otp, dto.purpose);
    return { success: true, data: { verified: true } };
  }

  // ─── Token Refresh ────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh B2C access token' })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.b2cAuthService.refreshTokens(dto.refreshToken);
    return { success: true, data: tokens };
  }

  // ─── Two-Factor Auth ──────────────────────────────────────

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  async enable2FA(@Req() req: Request) {
    const customerAuthId = req.customerAuthId!;
    const result = await this.twoFactorService.enable2FA(customerAuthId);
    return { success: true, data: result };
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify 2FA code (completes setup or validates)' })
  async verify2FA(@Req() req: Request, @Body() dto: TwoFactorCodeDto) {
    const customerAuthId = req.customerAuthId!;
    await this.twoFactorService.verify2FA(customerAuthId, dto.code);
    return { success: true, data: { verified: true } };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  async disable2FA(@Req() req: Request, @Body() dto: TwoFactorCodeDto) {
    const customerAuthId = req.customerAuthId!;
    await this.twoFactorService.disable2FA(customerAuthId, dto.code);
    return { success: true, data: { disabled: true } };
  }

  // ─── Profile ──────────────────────────────────────────────

  @Get('me')
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current B2C customer profile' })
  async getProfile(@Req() req: Request) {
    const customerAuthId = req.customerAuthId!;
    const profile = await this.b2cAuthService.getProfile(customerAuthId);
    return { success: true, data: profile };
  }
}
