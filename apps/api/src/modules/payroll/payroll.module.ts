// ─── Payroll Module ───────────────────────────────────────────
// Employees, attendance, salary structures, payroll periods,
// payslips, and bank file generation.

import { Module } from '@nestjs/common';
import { PayrollEmployeeService } from './payroll.employee.service';
import { PayrollAttendanceService } from './payroll.attendance.service';
import { PayrollSalaryService } from './payroll.salary.service';
import { PayrollProcessingService } from './payroll.processing.service';
import { PayrollPayslipService } from './payroll.payslip.service';
import { PayrollBankFileService } from './payroll.bankfile.service';
import { PayrollTrpcRouter } from './payroll.trpc';

@Module({
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
