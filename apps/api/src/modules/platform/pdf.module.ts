// ─── Global PDF Module ────────────────────────────────────────
// Exposes PlatformPdfService globally so that any domain module
// (financial, retail, hardware, export, …) can inject it without
// violating cross-module import boundaries. The service itself
// lives in the platform folder because PDF is a platform concern.

import { Global, Module } from '@nestjs/common';
import { PlatformPdfService } from './platform.pdf.service';

@Global()
@Module({
  providers: [PlatformPdfService],
  exports: [PlatformPdfService],
})
export class PdfModule {}
