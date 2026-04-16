// ─── Payroll Module ───────────────────────────────────────────
// Employees, attendance, salary structures, payroll periods,
// payslips, and bank file generation.
//
// Imports CrmModule so that the payslip service can inject
// EmailService (SendGrid) for payslip email delivery. The
// PlatformPdfService is provided by the @Global() PdfModule
// and therefore needs no explicit import here.

import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { PayrollEmployeeService } from './payroll.employee.service';
import { PayrollAttendanceService } from './payroll.attendance.service';
import { PayrollSalaryService } from './payroll.salary.service';
import { PayrollProcessingService } from './payroll.processing.service';
import { PayrollPayslipService } from './payroll.payslip.service';
import { PayrollBankFileService } from './payroll.bankfile.service';
import { PayrollTrpcRouter } from './payroll.trpc';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [CrmModule],
  controllers: [PayrollController],
  providers: [
    PayrollEmployeeService,
    PayrollAttendanceService,
    PayrollSalaryService,
    PayrollProcessingService,
    PayrollPayslipService,
    PayrollBankFileService,
    PayrollTrpcRouter,
  ],
  exports: [
    PayrollEmployeeService,
    PayrollAttendanceService,
    PayrollSalaryService,
    PayrollProcessingService,
    PayrollPayslipService,
    PayrollBankFileService,
    PayrollTrpcRouter,
  ],
})
export class PayrollModule {}
