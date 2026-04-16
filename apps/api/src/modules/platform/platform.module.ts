// ─── Platform Module ───────────────────────────────────────────
// Tenant settings, user management, branch management, RBAC,
// audit logging, notifications, file management, i18n, import/export.

import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
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
import { PlatformTrpc } from './platform.trpc';
import { PlatformEventHandler } from './platform.event-handler';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  // CrmModule re-exports EmailService so PlatformUserService can dispatch
  // real invite / welcome emails at runtime.
  imports: [CrmModule],
  providers: [
    PlatformUserService,
    PlatformRoleService,
    PlatformBranchService,
    PlatformSettingsService,
    PlatformImportService,
    PlatformExportService,
    PlatformAuditService,
    PlatformNotificationService,
    PlatformFileService,
    PlatformI18nService,
    PlatformTrpc,
    PlatformEventHandler,
    RealtimeGateway,
  ],
  exports: [
    PlatformUserService,
    PlatformRoleService,
    PlatformBranchService,
    PlatformSettingsService,
    PlatformAuditService,
    PlatformNotificationService,
    PlatformFileService,
    PlatformI18nService,
    PlatformTrpc,
    RealtimeGateway,
  ],
})
export class PlatformModule {}
