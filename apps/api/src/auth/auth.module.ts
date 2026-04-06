import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { B2CAuthService } from './auth.b2c.service';
import { B2CAuthController } from './auth.b2c.controller';
import { B2CAuthGuard } from './b2c-auth.guard';
import { OtpService } from './auth.otp.service';
import { SocialAuthService } from './auth.social.service';
import { TwoFactorAuthService } from './auth.2fa.service';

@Module({
  controllers: [AuthController, B2CAuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    B2CAuthService,
    B2CAuthGuard,
    OtpService,
    SocialAuthService,
    TwoFactorAuthService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    B2CAuthService,
    B2CAuthGuard,
    OtpService,
    SocialAuthService,
    TwoFactorAuthService,
  ],
})
export class AuthModule {}
