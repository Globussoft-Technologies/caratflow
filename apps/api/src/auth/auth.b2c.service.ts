import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { OtpService } from './auth.otp.service';
import { SocialAuthService } from './auth.social.service';
import { TwoFactorAuthService } from './auth.2fa.service';
import type { SocialProvider, LoginProvider } from '@caratflow/db';
import type { B2CJwtPayload, B2CCustomerProfile, B2CAuthResponse, B2CTokenPair } from '@caratflow/shared-types';

interface B2CTokenPairInternal {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class B2CAuthService {
  private readonly logger = new Logger(B2CAuthService.name);
  private readonly jwtSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly socialAuthService: SocialAuthService,
    private readonly twoFactorService: TwoFactorAuthService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production';
    this.accessExpiry = process.env.JWT_B2C_ACCESS_EXPIRY ?? '30m';
    this.refreshExpiry = process.env.JWT_B2C_REFRESH_EXPIRY ?? '30d';
  }

  // ─── Registration ───────────────────────────────────────────

  /**
   * Register a new B2C customer with email and password.
   */
  async registerWithEmail(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantSlug: string,
  ): Promise<B2CAuthResponse> {
    const tenant = await this.resolveTenant(tenantSlug);

    // Check if email is already registered
    const existingAuth = await this.prisma.customerAuth.findUnique({
      where: { email },
    });
    if (existingAuth) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const customerId = uuid();
    const customerAuthId = uuid();

    // Create Customer and CustomerAuth in a transaction
    const [, customerAuth] = await this.prisma.$transaction([
      this.prisma.customer.create({
        data: {
          id: customerId,
          tenantId: tenant.id,
          firstName,
          lastName,
          email,
          customerType: 'RETAIL',
        },
      }),
      this.prisma.customerAuth.create({
        data: {
          id: customerAuthId,
          customerId,
          email,
          passwordHash,
          loginProvider: 'EMAIL',
        },
        include: { customer: true },
      }),
    ]);

    // Send verification email (async, non-blocking)
    this.sendVerificationEmail(email).catch((err) => {
      this.logger.error(`Failed to send verification email to ${email}`, err);
    });

    const tokens = await this.generateB2CTokenPair(customerAuth, tenant.id);

    return {
      customer: this.buildCustomerProfile(customerAuth, tenant.id),
      ...tokens,
    };
  }

  /**
   * Register a new B2C customer with phone number and password.
   */
  async registerWithPhone(
    phone: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantSlug: string,
  ): Promise<B2CAuthResponse> {
    const tenant = await this.resolveTenant(tenantSlug);

    // Check if phone is already registered
    const existingAuth = await this.prisma.customerAuth.findUnique({
      where: { phone },
    });
    if (existingAuth) {
      throw new ConflictException('An account with this phone number already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const customerId = uuid();
    const customerAuthId = uuid();

    const [, customerAuth] = await this.prisma.$transaction([
      this.prisma.customer.create({
        data: {
          id: customerId,
          tenantId: tenant.id,
          firstName,
          lastName,
          phone,
          customerType: 'RETAIL',
        },
      }),
      this.prisma.customerAuth.create({
        data: {
          id: customerAuthId,
          customerId,
          phone,
          passwordHash,
          loginProvider: 'PHONE',
        },
        include: { customer: true },
      }),
    ]);

    // Send OTP for phone verification
    await this.otpService.generateOtp(phone, 'REGISTRATION');

    const tokens = await this.generateB2CTokenPair(customerAuth, tenant.id);

    return {
      customer: this.buildCustomerProfile(customerAuth, tenant.id),
      ...tokens,
    };
  }

  // ─── Login ──────────────────────────────────────────────────

  /**
   * Login a B2C customer with email and password.
   */
  async loginWithEmail(
    email: string,
    password: string,
    tenantSlug: string,
    twoFactorCode?: string,
  ): Promise<B2CAuthResponse> {
    const tenant = await this.resolveTenant(tenantSlug);

    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { email },
      include: { customer: true },
    });

    if (!customerAuth || !customerAuth.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify the customer belongs to this tenant
    if (customerAuth.customer.tenantId !== tenant.id) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, customerAuth.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check 2FA requirement
    if (customerAuth.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new UnauthorizedException('Two-factor authentication code required');
      }
      await this.twoFactorService.verify2FA(customerAuth.id, twoFactorCode);
    }

    // Update last login
    await this.prisma.customerAuth.update({
      where: { id: customerAuth.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateB2CTokenPair(customerAuth, tenant.id);

    return {
      customer: this.buildCustomerProfile(customerAuth, tenant.id),
      ...tokens,
    };
  }

  /**
   * Initiate phone login by sending an OTP.
   */
  async loginWithPhoneSendOtp(
    phone: string,
    tenantSlug: string,
  ): Promise<{ message: string; otp?: string }> {
    const tenant = await this.resolveTenant(tenantSlug);

    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { phone },
      include: { customer: true },
    });

    if (!customerAuth) {
      throw new UnauthorizedException('No account found with this phone number');
    }

    if (customerAuth.customer.tenantId !== tenant.id) {
      throw new UnauthorizedException('No account found with this phone number');
    }

    return this.otpService.generateOtp(phone, 'LOGIN');
  }

  /**
   * Complete phone login by verifying the OTP.
   */
  async loginWithPhoneVerifyOtp(
    phone: string,
    otp: string,
    tenantSlug: string,
  ): Promise<B2CAuthResponse> {
    const tenant = await this.resolveTenant(tenantSlug);

    await this.otpService.verifyOtp(phone, otp, 'LOGIN');

    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { phone },
      include: { customer: true },
    });

    if (!customerAuth || customerAuth.customer.tenantId !== tenant.id) {
      throw new UnauthorizedException('No account found with this phone number');
    }

    // Mark phone as verified if not already
    if (!customerAuth.isPhoneVerified) {
      await this.prisma.customerAuth.update({
        where: { id: customerAuth.id },
        data: { isPhoneVerified: true },
      });
    }

    // Update last login
    await this.prisma.customerAuth.update({
      where: { id: customerAuth.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateB2CTokenPair(customerAuth, tenant.id);

    return {
      customer: this.buildCustomerProfile(
        { ...customerAuth, isPhoneVerified: true },
        tenant.id,
      ),
      ...tokens,
    };
  }

  // ─── Social Login ──────────────────────────────────────────

  /**
   * Authenticate via social provider. Creates customer if new.
   */
  async socialLogin(
    provider: SocialProvider,
    idToken: string | undefined,
    accessToken: string | undefined,
    tenantSlug: string,
  ): Promise<B2CAuthResponse> {
    const tenant = await this.resolveTenant(tenantSlug);

    // Verify token with the social provider
    const socialProfile = await this.socialAuthService.verifySocialToken(
      provider,
      idToken,
      accessToken,
    );

    // Check if this social account is already linked
    const existingAuth = await this.socialAuthService.findCustomerBySocialAccount(
      provider,
      socialProfile.providerAccountId,
    );

    if (existingAuth) {
      // Existing customer -- verify tenant match
      if (existingAuth.customer.tenantId !== tenant.id) {
        throw new UnauthorizedException('Account does not belong to this store');
      }

      // Update last login
      await this.prisma.customerAuth.update({
        where: { id: existingAuth.id },
        data: { lastLoginAt: new Date() },
      });

      const tokens = await this.generateB2CTokenPair(existingAuth, tenant.id);
      return {
        customer: this.buildCustomerProfile(existingAuth, tenant.id),
        ...tokens,
      };
    }

    // New customer -- check if email already exists
    let customerAuth = socialProfile.email
      ? await this.prisma.customerAuth.findUnique({
          where: { email: socialProfile.email },
          include: { customer: true },
        })
      : null;

    if (customerAuth) {
      // Link social account to existing email-based account
      if (customerAuth.customer.tenantId !== tenant.id) {
        throw new UnauthorizedException('Account does not belong to this store');
      }

      await this.socialAuthService.linkSocialAccount(
        customerAuth.id,
        provider,
        socialProfile,
        { accessToken: accessToken, expiresAt: undefined },
      );
    } else {
      // Create new customer + customer auth
      const customerId = uuid();
      const customerAuthId = uuid();
      const loginProvider = provider as unknown as LoginProvider;

      const firstName = socialProfile.firstName ?? socialProfile.name?.split(' ')[0] ?? 'Customer';
      const lastName = socialProfile.lastName ?? socialProfile.name?.split(' ').slice(1).join(' ') ?? '';

      const [, newAuth] = await this.prisma.$transaction([
        this.prisma.customer.create({
          data: {
            id: customerId,
            tenantId: tenant.id,
            firstName,
            lastName,
            email: socialProfile.email,
            customerType: 'RETAIL',
          },
        }),
        this.prisma.customerAuth.create({
          data: {
            id: customerAuthId,
            customerId,
            email: socialProfile.email,
            isEmailVerified: !!socialProfile.email, // Social providers verify email
            loginProvider,
          },
          include: { customer: true },
        }),
      ]);

      customerAuth = newAuth;

      // Link social account
      await this.socialAuthService.linkSocialAccount(
        customerAuthId,
        provider,
        socialProfile,
        { accessToken: accessToken, expiresAt: undefined },
      );
    }

    // Update last login
    await this.prisma.customerAuth.update({
      where: { id: customerAuth.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateB2CTokenPair(customerAuth, tenant.id);
    return {
      customer: this.buildCustomerProfile(customerAuth, tenant.id),
      ...tokens,
    };
  }

  // ─── Token Refresh ─────────────────────────────────────────

  /**
   * Refresh B2C access token using a refresh token (with rotation).
   */
  async refreshTokens(refreshTokenValue: string): Promise<B2CTokenPair> {
    const stored = await this.prisma.customerRefreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: {
        customerAuth: {
          include: { customer: true },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke current token (rotation)
    await this.prisma.customerRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tenantId = stored.customerAuth.customer.tenantId;
    return this.generateB2CTokenPair(stored.customerAuth, tenantId);
  }

  // ─── Profile ───────────────────────────────────────────────

  /**
   * Get current customer profile by CustomerAuth ID.
   */
  async getProfile(customerAuthId: string): Promise<B2CCustomerProfile> {
    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { id: customerAuthId },
      include: { customer: true },
    });

    if (!customerAuth) {
      throw new NotFoundException('Customer not found');
    }

    return this.buildCustomerProfile(customerAuth, customerAuth.customer.tenantId);
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async resolveTenant(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid or inactive store');
    }

    return tenant;
  }

  private async generateB2CTokenPair(
    customerAuth: { id: string; customerId: string; email: string | null; phone: string | null },
    tenantId: string,
  ): Promise<B2CTokenPairInternal> {
    const payload: B2CJwtPayload = {
      sub: customerAuth.id,
      customerId: customerAuth.customerId,
      tenantId,
      email: customerAuth.email,
      phone: customerAuth.phone,
      type: 'b2c',
    };

    const accessToken = jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: this.accessExpiry as unknown as number,
    });

    const refreshTokenValue = uuid() + '-' + uuid();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await this.prisma.customerRefreshToken.create({
      data: {
        id: uuid(),
        customerAuthId: customerAuth.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 1800, // 30 minutes in seconds
    };
  }

  private buildCustomerProfile(
    customerAuth: {
      id: string;
      customerId: string;
      email: string | null;
      phone: string | null;
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
      twoFactorEnabled: boolean;
      loginProvider: LoginProvider;
      customer: { firstName: string; lastName: string };
    },
    tenantId: string,
  ): B2CCustomerProfile {
    return {
      id: customerAuth.id,
      customerId: customerAuth.customerId,
      email: customerAuth.email,
      phone: customerAuth.phone,
      firstName: customerAuth.customer.firstName,
      lastName: customerAuth.customer.lastName,
      isEmailVerified: customerAuth.isEmailVerified,
      isPhoneVerified: customerAuth.isPhoneVerified,
      twoFactorEnabled: customerAuth.twoFactorEnabled,
      loginProvider: customerAuth.loginProvider as unknown as import('@caratflow/shared-types').LoginProviderEnum,
      tenantId,
    };
  }

  private async sendVerificationEmail(email: string): Promise<void> {
    // TODO: Integrate with email service (SES/SendGrid)
    // Generate a verification token and send a link
    const verificationToken = uuid();
    this.logger.warn(
      `[B2C_AUTH] Email verification token for ${email}: ${verificationToken}`,
    );
  }
}
