import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { PlatformUserService } from './platform.user.service';
import { PlatformRoleService } from './platform.role.service';
import { PlatformBranchService } from './platform.branch.service';
import { PlatformSettingsService } from './platform.settings.service';
import { PlatformImportService } from './platform.import.service';
import { PlatformExportService } from './platform.export.service';
import { PlatformAuditService } from './platform.audit.service';
import { PlatformNotificationService } from './platform.notification.service';
import { PlatformFileService } from './platform.file.service';
import { PlatformI18nService } from './platform.i18n.service';
import { PaginationSchema } from '@caratflow/shared-types';

@Injectable()
export class PlatformTrpc {
  constructor(
    private readonly trpc: TrpcService,
    private readonly userService: PlatformUserService,
    private readonly roleService: PlatformRoleService,
    private readonly branchService: PlatformBranchService,
    private readonly settingsService: PlatformSettingsService,
    private readonly importService: PlatformImportService,
    private readonly exportService: PlatformExportService,
    private readonly auditService: PlatformAuditService,
    private readonly notificationService: PlatformNotificationService,
    private readonly fileService: PlatformFileService,
    private readonly i18nService: PlatformI18nService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Users ────────────────────────────────────────────────
      users: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(
            z.object({
              ...PaginationSchema.shape,
              search: z.string().optional(),
              isActive: z.boolean().optional(),
            }),
          )
          .query(({ ctx, input }) =>
            this.userService.listUsers(ctx.tenantId, {
              page: input.page,
              limit: input.limit,
              sortBy: input.sortBy,
              sortOrder: input.sortOrder,
              search: input.search,
              isActive: input.isActive,
            }),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ userId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.userService.getUserById(ctx.tenantId, input.userId),
          ),

        invite: this.trpc.authedProcedure
          .input(
            z.object({
              email: z.string().email(),
              firstName: z.string().min(1).max(100),
              lastName: z.string().min(1).max(100),
              roleId: z.string().uuid().optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.userService.inviteUser(ctx.tenantId, input, { userId: ctx.userId }),
          ),

        activate: this.trpc.authedProcedure
          .input(z.object({ userId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.userService.activateUser(ctx.tenantId, input.userId, { userId: ctx.userId }),
          ),

        deactivate: this.trpc.authedProcedure
          .input(z.object({ userId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.userService.deactivateUser(ctx.tenantId, input.userId, { userId: ctx.userId }),
          ),

        updateProfile: this.trpc.authedProcedure
          .input(
            z.object({
              userId: z.string().uuid(),
              firstName: z.string().min(1).max(100).optional(),
              lastName: z.string().min(1).max(100).optional(),
              preferences: z.record(z.unknown()).optional(),
            }),
          )
          .mutation(({ ctx, input }) => {
            const { userId, ...rest } = input;
            return this.userService.updateProfile(ctx.tenantId, userId, rest, { userId: ctx.userId });
          }),

        changePassword: this.trpc.authedProcedure
          .input(
            z.object({
              currentPassword: z.string().min(1),
              newPassword: z.string().min(8),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.userService.changePassword(ctx.tenantId, ctx.userId, input),
          ),
      }),

      // ─── Roles ────────────────────────────────────────────────
      roles: this.trpc.router({
        list: this.trpc.authedProcedure.query(({ ctx }) =>
          this.roleService.listRoles(ctx.tenantId),
        ),

        getById: this.trpc.authedProcedure
          .input(z.object({ roleId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.roleService.getRoleById(ctx.tenantId, input.roleId),
          ),

        create: this.trpc.authedProcedure
          .input(
            z.object({
              name: z.string().min(1).max(100),
              description: z.string().max(500).optional(),
              permissions: z.array(z.string()),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.roleService.createRole(ctx.tenantId, input, { userId: ctx.userId }),
          ),

        update: this.trpc.authedProcedure
          .input(
            z.object({
              roleId: z.string().uuid(),
              name: z.string().min(1).max(100).optional(),
              description: z.string().max(500).optional(),
              permissions: z.array(z.string()).optional(),
            }),
          )
          .mutation(({ ctx, input }) => {
            const { roleId, ...rest } = input;
            return this.roleService.updateRole(ctx.tenantId, roleId, rest, { userId: ctx.userId });
          }),

        delete: this.trpc.authedProcedure
          .input(z.object({ roleId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.roleService.deleteRole(ctx.tenantId, input.roleId),
          ),

        assignToUser: this.trpc.authedProcedure
          .input(z.object({ userId: z.string().uuid(), roleId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.roleService.assignRoleToUser(ctx.tenantId, input.userId, input.roleId, { userId: ctx.userId }),
          ),

        permissions: this.trpc.authedProcedure.query(() =>
          this.roleService.getAllPermissions(),
        ),

        seedPermissions: this.trpc.authedProcedure.mutation(() =>
          this.roleService.seedDefaultPermissions(),
        ),
      }),

      // ─── Branches ─────────────────────────────────────────────
      branches: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ includeInactive: z.boolean().optional() }).optional())
          .query(({ ctx, input }) =>
            this.branchService.listBranches(ctx.tenantId, input?.includeInactive),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ branchId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.branchService.getBranchById(ctx.tenantId, input.branchId),
          ),

        create: this.trpc.authedProcedure
          .input(
            z.object({
              name: z.string().min(1).max(255),
              locationType: z.enum(['SHOWROOM', 'WAREHOUSE', 'WORKSHOP', 'OFFICE']),
              address: z.string().max(500).optional(),
              city: z.string().max(100).optional(),
              state: z.string().max(100).optional(),
              country: z.string().max(2).optional(),
              postalCode: z.string().max(20).optional(),
              phone: z.string().max(20).optional(),
              email: z.string().email().optional(),
              settings: z.record(z.unknown()).optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.branchService.createBranch(ctx.tenantId, input as Parameters<typeof this.branchService.createBranch>[1], { userId: ctx.userId }),
          ),

        update: this.trpc.authedProcedure
          .input(
            z.object({
              branchId: z.string().uuid(),
              name: z.string().min(1).max(255).optional(),
              locationType: z.enum(['SHOWROOM', 'WAREHOUSE', 'WORKSHOP', 'OFFICE']).optional(),
              address: z.string().max(500).optional(),
              city: z.string().max(100).optional(),
              state: z.string().max(100).optional(),
              country: z.string().max(2).optional(),
              postalCode: z.string().max(20).optional(),
              phone: z.string().max(20).optional(),
              email: z.string().email().optional(),
              isActive: z.boolean().optional(),
              settings: z.record(z.unknown()).optional(),
            }),
          )
          .mutation(({ ctx, input }) => {
            const { branchId, ...rest } = input;
            return this.branchService.updateBranch(ctx.tenantId, branchId, rest as Parameters<typeof this.branchService.updateBranch>[2], { userId: ctx.userId });
          }),

        deactivate: this.trpc.authedProcedure
          .input(z.object({ branchId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.branchService.deactivateBranch(ctx.tenantId, input.branchId, { userId: ctx.userId }),
          ),

        setUserActiveBranch: this.trpc.authedProcedure
          .input(z.object({ branchId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.branchService.setUserActiveBranch(ctx.tenantId, ctx.userId, input.branchId),
          ),

        updateSettings: this.trpc.authedProcedure
          .input(
            z.object({
              branchId: z.string().uuid(),
              settings: z.record(z.unknown()),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.branchService.updateBranchSettings(ctx.tenantId, input.branchId, input.settings as Parameters<typeof this.branchService.updateBranchSettings>[2], { userId: ctx.userId }),
          ),
      }),

      // ─── Settings ─────────────────────────────────────────────
      settings: this.trpc.router({
        getAll: this.trpc.authedProcedure
          .input(z.object({ category: z.string().optional() }).optional())
          .query(({ ctx, input }) =>
            this.settingsService.getSettings(ctx.tenantId, input?.category as Parameters<typeof this.settingsService.getSettings>[1]),
          ),

        get: this.trpc.authedProcedure
          .input(z.object({ key: z.string() }))
          .query(({ ctx, input }) =>
            this.settingsService.getSetting(ctx.tenantId, input.key),
          ),

        set: this.trpc.authedProcedure
          .input(
            z.object({
              settings: z.array(
                z.object({
                  key: z.string(),
                  value: z.unknown(),
                  category: z.enum(['general', 'billing', 'tax', 'pos', 'notifications', 'display']),
                  description: z.string().optional(),
                }),
              ),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.settingsService.setSettings(ctx.tenantId, input.settings as Parameters<typeof this.settingsService.setSettings>[1], { userId: ctx.userId }),
          ),

        initialize: this.trpc.authedProcedure.mutation(({ ctx }) =>
          this.settingsService.initializeDefaults(ctx.tenantId),
        ),
      }),

      // ─── Import ───────────────────────────────────────────────
      import: this.trpc.router({
        getEntityFields: this.trpc.authedProcedure
          .input(z.object({ entityType: z.enum(['customer', 'product', 'supplier']) }))
          .query(({ input }) => this.importService.getEntityFields(input.entityType)),

        create: this.trpc.authedProcedure
          .input(
            z.object({
              fileName: z.string(),
              fileUrl: z.string().optional(),
              entityType: z.enum(['customer', 'product', 'supplier']),
              totalRows: z.number().int().nonnegative(),
              columnMapping: z.record(z.string()),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.importService.createImportJob(ctx.tenantId, input, { userId: ctx.userId }),
          ),

        process: this.trpc.authedProcedure
          .input(
            z.object({
              importJobId: z.string().uuid(),
              rows: z.array(z.record(z.unknown())),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.importService.processImport(ctx.tenantId, input.importJobId, input.rows, { userId: ctx.userId }),
          ),

        getJob: this.trpc.authedProcedure
          .input(z.object({ jobId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.importService.getImportJob(ctx.tenantId, input.jobId),
          ),

        listJobs: this.trpc.authedProcedure
          .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(20) }))
          .query(({ ctx, input }) =>
            this.importService.listImportJobs(ctx.tenantId, input.page, input.limit),
          ),
      }),

      // ─── Export ───────────────────────────────────────────────
      export: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(
            z.object({
              entityType: z.enum(['customer', 'product', 'supplier', 'invoice', 'stock']),
              filters: z.record(z.unknown()).optional(),
              format: z.enum(['CSV', 'XLSX', 'PDF']),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.exportService.createExportJob(ctx.tenantId, input, { userId: ctx.userId }),
          ),

        getJob: this.trpc.authedProcedure
          .input(z.object({ jobId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.exportService.getExportJob(ctx.tenantId, input.jobId),
          ),

        listJobs: this.trpc.authedProcedure
          .input(z.object({ page: z.number().int().min(1).default(1), limit: z.number().int().min(1).max(100).default(20) }))
          .query(({ ctx, input }) =>
            this.exportService.listExportJobs(ctx.tenantId, input.page, input.limit),
          ),
      }),

      // ─── Audit ────────────────────────────────────────────────
      audit: this.trpc.router({
        logs: this.trpc.authedProcedure
          .input(
            z.object({
              ...PaginationSchema.shape,
              entityType: z.string().optional(),
              entityId: z.string().optional(),
              userId: z.string().uuid().optional(),
              action: z.string().optional(),
              dateFrom: z.string().optional(),
              dateTo: z.string().optional(),
            }),
          )
          .query(({ ctx, input }) =>
            this.auditService.queryAuditLogs(ctx.tenantId, input),
          ),

        entityTypes: this.trpc.authedProcedure.query(({ ctx }) =>
          this.auditService.getAuditEntityTypes(ctx.tenantId),
        ),

        activities: this.trpc.authedProcedure
          .input(
            z.object({
              ...PaginationSchema.shape,
              userId: z.string().uuid().optional(),
              action: z.string().optional(),
              dateFrom: z.string().optional(),
              dateTo: z.string().optional(),
            }),
          )
          .query(({ ctx, input }) =>
            this.auditService.queryActivityLogs(ctx.tenantId, input),
          ),
      }),

      // ─── Notifications ────────────────────────────────────────
      notifications: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(
            z.object({
              page: z.number().int().min(1).default(1),
              limit: z.number().int().min(1).max(100).default(20),
              unreadOnly: z.boolean().optional(),
            }),
          )
          .query(({ ctx, input }) =>
            this.notificationService.getUserNotifications(
              ctx.tenantId,
              ctx.userId,
              input.page,
              input.limit,
              input.unreadOnly,
            ),
          ),

        unreadCount: this.trpc.authedProcedure.query(({ ctx }) =>
          this.notificationService.getUnreadCount(ctx.tenantId, ctx.userId),
        ),

        markAsRead: this.trpc.authedProcedure
          .input(z.object({ notificationId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.notificationService.markAsRead(ctx.tenantId, input.notificationId, ctx.userId),
          ),

        markAllAsRead: this.trpc.authedProcedure.mutation(({ ctx }) =>
          this.notificationService.markAllAsRead(ctx.tenantId, ctx.userId),
        ),

        delete: this.trpc.authedProcedure
          .input(z.object({ notificationId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.notificationService.deleteNotification(ctx.tenantId, input.notificationId, ctx.userId),
          ),
      }),

      // ─── i18n ─────────────────────────────────────────────────
      i18n: this.trpc.router({
        locales: this.trpc.procedure.query(() =>
          this.i18nService.getSupportedLocales(),
        ),

        namespaces: this.trpc.authedProcedure.query(() =>
          this.i18nService.getNamespaces(),
        ),

        translations: this.trpc.procedure
          .input(z.object({ namespace: z.string(), locale: z.string().default('en') }))
          .query(({ input }) =>
            this.i18nService.getTranslationsByNamespace(input.namespace, input.locale as 'en'),
          ),

        list: this.trpc.authedProcedure
          .input(
            z.object({
              page: z.number().int().min(1).default(1),
              limit: z.number().int().min(1).max(100).default(50),
              namespace: z.string().optional(),
              search: z.string().optional(),
            }),
          )
          .query(({ input }) =>
            this.i18nService.listTranslationKeys(input.page, input.limit, input.namespace, input.search),
          ),

        create: this.trpc.authedProcedure
          .input(
            z.object({
              namespace: z.string().min(1).max(50),
              key: z.string().min(1).max(200),
              defaultValue: z.string(),
              translations: z.record(z.string()).optional(),
            }),
          )
          .mutation(({ input }) => this.i18nService.createTranslationKey(input)),

        update: this.trpc.authedProcedure
          .input(
            z.object({
              id: z.string().uuid(),
              defaultValue: z.string().optional(),
              translations: z.record(z.string()).optional(),
            }),
          )
          .mutation(({ input }) => {
            const { id, ...rest } = input;
            return this.i18nService.updateTranslationKey(id, rest);
          }),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ input }) => this.i18nService.deleteTranslationKey(input.id)),

        bulkUpdate: this.trpc.authedProcedure
          .input(
            z.object({
              namespace: z.string(),
              locale: z.string(),
              translations: z.record(z.string()),
            }),
          )
          .mutation(({ input }) =>
            this.i18nService.bulkUpdateTranslations(input.namespace, input.locale as 'en', input.translations),
          ),
      }),
    });
  }
}
