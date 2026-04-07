export { prisma, PrismaClient } from './client';
export type { Prisma } from './client';

// Re-export all generated types for convenience
export {
  CustomerType,
  ProductType,
  LocationType,
  AccountType,
  SocialProvider,
  OtpPurpose,
  LoginProvider,
} from '@prisma/client';

export type {
  Tenant,
  User,
  Role,
  Customer,
  Supplier,
  Product,
  Category,
  Location,
  Account,
  Currency,
  Country,
  AuditLog,
  RefreshToken,
} from '@prisma/client';
