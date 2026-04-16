import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { B2CAuthService } from './auth.b2c.service';
import { B2CAuthController } from './auth.b2c.controller';
import { B2CAuthGuard } from './b2c-auth.guard';
import { OtpService } from './auth.otp.service';
import { SocialAuthService } from './auth.social.service';
import { TwoFactorAuthService } from './auth.2fa.service';
import { CrmModule } from '../modules/crm/crm.module';

@Module({
  // CrmModule exports EmailService / SmsService / WhatsAppService which the
  // OtpService, AuthService password-reset, and B2C welcome email rely on.
  // Wrapped in forwardRef to keep things robust against any future cycle
  // (CrmController imports B2CAuthGuard from auth, so Nest DI needs to
  // resolve both sides during bootstrap).
  imports: [forwardRef(() => CrmModule)],
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
