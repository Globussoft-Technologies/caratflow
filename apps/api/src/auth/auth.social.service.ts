import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import type { SocialProvider } from '@caratflow/db';

export interface SocialUserProfile {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify a Google ID token and extract user profile.
   * In production, use googleapis (google-auth-library) to verify.
   */
  async verifyGoogleToken(idToken: string): Promise<SocialUserProfile> {
    try {
      // TODO: Replace with actual Google token verification
      // const { OAuth2Client } = require('google-auth-library');
      // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      // const ticket = await client.verifyIdToken({
      //   idToken,
      //   audience: process.env.GOOGLE_CLIENT_ID,
      // });
      // const payload = ticket.getPayload();

      // Placeholder: In production, decode and verify the token
      this.logger.warn('[SOCIAL] Google token verification is using placeholder logic');

      // This will be replaced with actual decoded payload
      throw new UnauthorizedException(
        'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Verify a Facebook access token via Graph API.
   */
  async verifyFacebookToken(accessToken: string): Promise<SocialUserProfile> {
    try {
      // TODO: Replace with actual Facebook token verification
      // const response = await fetch(
      //   `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}`
      // );
      // const data = await response.json();

      this.logger.warn('[SOCIAL] Facebook token verification is using placeholder logic');

      throw new UnauthorizedException(
        'Facebook OAuth not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.',
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }

  /**
   * Verify an Apple ID token (Sign in with Apple).
   */
  async verifyAppleToken(idToken: string): Promise<SocialUserProfile> {
    try {
      // TODO: Replace with actual Apple token verification
      // Use apple-signin-auth or jose to verify the JWT from Apple
      // const appleUser = await appleSignin.verifyIdToken(idToken, {
      //   audience: process.env.APPLE_CLIENT_ID,
      //   ignoreExpiration: false,
      // });

      this.logger.warn('[SOCIAL] Apple token verification is using placeholder logic');

      throw new UnauthorizedException(
        'Apple Sign-In not configured. Set APPLE_CLIENT_ID and APPLE_TEAM_ID environment variables.',
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  /**
   * Verify a social token based on provider.
   */
  async verifySocialToken(
    provider: SocialProvider,
    idToken?: string,
    accessToken?: string,
  ): Promise<SocialUserProfile> {
    switch (provider) {
      case 'GOOGLE':
        if (!idToken) throw new UnauthorizedException('Google login requires idToken');
        return this.verifyGoogleToken(idToken);

      case 'FACEBOOK':
        if (!accessToken) throw new UnauthorizedException('Facebook login requires accessToken');
        return this.verifyFacebookToken(accessToken);

      case 'APPLE':
        if (!idToken) throw new UnauthorizedException('Apple login requires idToken');
        return this.verifyAppleToken(idToken);

      default:
        throw new UnauthorizedException(`Unsupported social provider: ${provider}`);
    }
  }

  /**
   * Link a social account to an existing CustomerAuth record.
   */
  async linkSocialAccount(
    customerAuthId: string,
    provider: SocialProvider,
    profile: SocialUserProfile,
    tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: Date },
  ): Promise<void> {
    // Check if this social account is already linked to someone else
    const existing = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    });

    if (existing && existing.customerId !== customerAuthId) {
      throw new UnauthorizedException(
        'This social account is already linked to a different customer.',
      );
    }

    if (existing) {
      // Update existing link
      await this.prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          accessToken: tokens?.accessToken,
          refreshToken: tokens?.refreshToken,
          expiresAt: tokens?.expiresAt,
        },
      });
    } else {
      // Create new link
      await this.prisma.socialAccount.create({
        data: {
          id: uuid(),
          customerId: customerAuthId,
          provider,
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          accessToken: tokens?.accessToken,
          refreshToken: tokens?.refreshToken,
          expiresAt: tokens?.expiresAt,
        },
      });
    }
  }

  /**
   * Find a CustomerAuth record by social provider account.
   */
  async findCustomerBySocialAccount(
    provider: SocialProvider,
    providerAccountId: string,
  ) {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        customerAuth: {
          include: {
            customer: true,
          },
        },
      },
    });

    return socialAccount?.customerAuth ?? null;
  }
}
