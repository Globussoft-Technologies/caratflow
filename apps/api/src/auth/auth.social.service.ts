import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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

// Lazy-init JWKS set for Apple — reused across requests (5 min cache internally).
let appleJwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
function getAppleJwks() {
  if (!appleJwksCache) {
    appleJwksCache = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  }
  return appleJwksCache;
}

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify a Google ID token by calling Google's tokeninfo endpoint.
   * Validates that the token's audience matches GOOGLE_CLIENT_ID.
   */
  async verifyGoogleToken(idToken: string): Promise<SocialUserProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException(
        'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      );
    }

    try {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const res = await fetch(url, { method: 'GET' });

      if (!res.ok) {
        this.logger.warn(`Google tokeninfo returned status ${res.status}`);
        throw new UnauthorizedException('Invalid Google token');
      }

      const payload = (await res.json()) as {
        sub?: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
        aud?: string;
        iss?: string;
        exp?: string | number;
      };

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid Google token: missing subject');
      }
      if (payload.aud !== clientId) {
        this.logger.warn(`Google token audience mismatch: expected ${clientId}, got ${payload.aud}`);
        throw new UnauthorizedException('Invalid Google token: audience mismatch');
      }
      const iss = payload.iss;
      if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
        throw new UnauthorizedException('Invalid Google token: untrusted issuer');
      }
      const exp = typeof payload.exp === 'string' ? parseInt(payload.exp, 10) : payload.exp ?? 0;
      if (!exp || exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Google token is expired');
      }

      return {
        providerAccountId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
        firstName: payload.given_name ?? null,
        lastName: payload.family_name ?? null,
        avatarUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Google token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Verify a Facebook access token via Graph API.
   * Uses /me?fields=... which implicitly validates the token.
   */
  async verifyFacebookToken(accessToken: string): Promise<SocialUserProfile> {
    const appId = process.env.FACEBOOK_APP_ID ?? process.env.FB_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.FB_APP_SECRET;
    if (!appId || !appSecret) {
      throw new UnauthorizedException(
        'Facebook OAuth not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.',
      );
    }

    try {
      // Step 1: debug_token to verify audience and validity
      const appToken = `${appId}|${appSecret}`;
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`;
      const debugRes = await fetch(debugUrl, { method: 'GET' });
      if (!debugRes.ok) {
        throw new UnauthorizedException('Invalid Facebook token');
      }
      const debugJson = (await debugRes.json()) as {
        data?: {
          app_id?: string;
          is_valid?: boolean;
          user_id?: string;
          expires_at?: number;
        };
      };
      const debugData = debugJson.data;
      if (!debugData || !debugData.is_valid) {
        throw new UnauthorizedException('Invalid or expired Facebook token');
      }
      if (debugData.app_id !== appId) {
        this.logger.warn('Facebook token app_id mismatch');
        throw new UnauthorizedException('Invalid Facebook token: app mismatch');
      }

      // Step 2: Fetch profile
      const meUrl = `https://graph.facebook.com/me?fields=id,email,first_name,last_name,name,picture&access_token=${encodeURIComponent(accessToken)}`;
      const meRes = await fetch(meUrl, { method: 'GET' });
      if (!meRes.ok) {
        throw new UnauthorizedException('Invalid Facebook token');
      }
      const me = (await meRes.json()) as {
        id?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        name?: string;
        picture?: { data?: { url?: string } };
      };

      if (!me.id) {
        throw new UnauthorizedException('Invalid Facebook token: missing user id');
      }

      return {
        providerAccountId: me.id,
        email: me.email ?? null,
        name: me.name ?? null,
        firstName: me.first_name ?? null,
        lastName: me.last_name ?? null,
        avatarUrl: me.picture?.data?.url ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Facebook token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }

  /**
   * Verify an Apple ID token (Sign in with Apple) against Apple's JWKS.
   */
  async verifyAppleToken(idToken: string): Promise<SocialUserProfile> {
    const clientId = process.env.APPLE_CLIENT_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    if (!clientId || !teamId) {
      throw new UnauthorizedException(
        'Apple Sign-In not configured. Set APPLE_CLIENT_ID and APPLE_TEAM_ID environment variables.',
      );
    }

    try {
      const jwks = getAppleJwks();
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: 'https://appleid.apple.com',
        audience: clientId,
      });

      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      if (!sub) {
        throw new UnauthorizedException('Invalid Apple token: missing subject');
      }

      const email = typeof payload.email === 'string' ? payload.email : null;
      // Apple does not supply name in id_token after first sign-in.
      return {
        providerAccountId: sub,
        email,
        name: null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Apple token verification failed: ${(error as Error).message}`);
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
