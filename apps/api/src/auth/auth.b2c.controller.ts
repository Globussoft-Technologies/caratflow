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
import { Throttle } from '@nestjs/throttler';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Request } from 'express';
import { B2CAuthService } from './auth.b2c.service';
import { OtpService } from './auth.otp.service';
import { TwoFactorAuthService } from './auth.2fa.service';
import { B2CAuthGuard } from './b2c-auth.guard';
import type { SocialProvider, OtpPurpose } from '@caratflow/db';

/**
 * Extract jti/exp from an `Authorization: Bearer …` header *without verifying*
 * the signature — used only to mark the token as revoked on the path through
 * /refresh and /logout where signature verification is intentionally skipped
 * (refresh works even if the access token is expired).
 */
function decodeAccessJtiExp(
  authHeader: string | undefined,
): { jti?: string; exp?: number } {
  if (!authHeader?.startsWith('Bearer ')) return {};
  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) return {};
  try {
    const payloadB64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as { jti?: unknown; exp?: unknown };
    return {
      jti: typeof parsed.jti === 'string' ? parsed.jti : undefined,
      exp: typeof parsed.exp === 'number' ? parsed.exp : undefined,
    };
  } catch {
    return {};
  }
}

// ─── DTOs ─────────────────────────────────────────────────────

// Password policy (D-043):
//   • 10–128 chars
//   • ≥ 1 lowercase, ≥ 1 uppercase, ≥ 1 digit, ≥ 1 special char
// Two regexes are easier to read (and to override) than one giant lookahead.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const PASSWORD_MESSAGE =
  'Password must be 10-128 characters and include uppercase, lowercase, a digit, and a special character';

// E.164-ish: optional leading +, 8-15 digits.
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

class RegisterEmailDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(10, { message: PASSWORD_MESSAGE })
  @MaxLength(128, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tenantSlug!: string;
}

class RegisterPhoneDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid E.164 number' })
  phone!: string;

  @IsString()
  @MinLength(10, { message: PASSWORD_MESSAGE })
  @MaxLength(128, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tenantSlug!: string;
}

class LoginEmailDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tenantSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  twoFactorCode?: string;
}

class LoginPhoneDto {
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid E.164 number' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tenantSlug!: string;
}

class SocialLoginDto {
  provider!: SocialProvider;
  @IsOptional() @IsString() @MaxLength(8000) idToken?: string;
  @IsOptional() @IsString() @MaxLength(8000) accessToken?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) tenantSlug!: string;
}

class OtpSendDto {
  @IsString() @IsNotEmpty() @MaxLength(254) identifier!: string;
  purpose!: OtpPurpose;
}

class OtpVerifyDto {
  @IsString() @IsNotEmpty() @MaxLength(254) identifier!: string;
  @IsString() @Matches(/^\d{4,8}$/, { message: 'otp must be 4-8 digits' }) otp!: string;
  purpose!: OtpPurpose;
  @IsOptional() @IsString() @MaxLength(80) tenantSlug?: string;
}

class RefreshDto {
  @IsString() @IsNotEmpty() @MaxLength(200) refreshToken!: string;
}

class TwoFactorCodeDto {
  @IsString() @Matches(/^\d{6}$/, { message: 'code must be 6 digits' }) code!: string;
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
  @Throttle({ long: { limit: 5, ttl: 60 * 60_000 } })
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
  @Throttle({ long: { limit: 5, ttl: 60 * 60_000 } })
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
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ short: { limit: 1, ttl: 30_000 }, medium: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
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
  @Throttle({ short: { limit: 1, ttl: 30_000 }, medium: { limit: 5, ttl: 60_000 } })
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
  async refresh(@Req() req: Request, @Body() dto: RefreshDto) {
    // If the old access token was sent in Authorization, decode it once
    // (without verifying) just to grab jti/exp so we can revoke it (D-037).
    const { jti, exp } = decodeAccessJtiExp(req.headers.authorization);
    const tokens = await this.b2cAuthService.refreshTokens(dto.refreshToken, jti, exp);
    return { success: true, data: tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (revoke refresh + access token)' })
  async logout(@Req() req: Request, @Body() dto: RefreshDto) {
    const { jti, exp } = decodeAccessJtiExp(req.headers.authorization);
    await this.b2cAuthService.logout(dto.refreshToken, jti, exp);
    return { success: true };
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
