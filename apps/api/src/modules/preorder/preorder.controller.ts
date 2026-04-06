// ─── Pre-Order REST Controller ────────────────────────────────
// Public-facing REST API for storefront customers.
// POST /api/v1/store/preorder
// GET  /api/v1/store/preorder/my
// GET  /api/v1/store/products/:id/preorder-status
// POST /api/v1/store/orders/:id/modify
// GET  /api/v1/store/orders/:id/modifications
// POST /api/v1/store/reorder/:orderId
// GET  /api/v1/store/reorder/history

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PreOrderService } from './preorder.service';
import { OrderModificationService } from './order-modification.service';
import { ReorderService } from './reorder.service';
import type { CreatePreOrderInput, RequestModificationInput } from '@caratflow/shared-types';

interface AuthenticatedRequest {
  tenantId: string;
  userId: string;
  customerId: string;
}

@ApiTags('store-preorder')
@Controller('api/v1/store')
export class PreOrderController {
  constructor(
    private readonly preOrderService: PreOrderService,
    private readonly modificationService: OrderModificationService,
    private readonly reorderService: ReorderService,
  ) {}

  // ─── Pre-Orders ───────────────────────────────────────────────

  @Post('preorder')
  @ApiOperation({ summary: 'Create a pre-order for a product' })
  async createPreOrder(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreatePreOrderInput,
  ) {
    const data = await this.preOrderService.createPreOrder(
      req.tenantId,
      req.userId,
      { ...body, customerId: req.customerId },
    );
    return { success: true, data };
  }

  @Get('preorder/my')
  @ApiOperation({ summary: 'Get my pre-orders' })
  async getMyPreOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.preOrderService.getMyPreOrders(
      req.tenantId,
      req.customerId,
      {
        page: parseInt(page ?? '1', 10),
        limit: parseInt(limit ?? '20', 10),
        sortOrder: 'desc',
      },
    );
    return { success: true, data };
  }

  @Get('products/:id/preorder-status')
  @ApiOperation({ summary: 'Check pre-order availability for a product' })
  async getProductPreOrderStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') productId: string,
  ) {
    const data = await this.preOrderService.checkProductPreOrderStatus(
      req.tenantId,
      productId,
    );
    return { success: true, data };
  }

  // ─── Order Modifications ──────────────────────────────────────

  @Post('orders/:id/modify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an order modification' })
  async requestModification(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() body: Omit<RequestModificationInput, 'orderId' | 'customerId'>,
  ) {
    const data = await this.modificationService.requestModification(
      req.tenantId,
      req.userId,
      {
        orderId,
        customerId: req.customerId,
        modificationType: body.modificationType,
        requestedData: body.requestedData,
        reason: body.reason,
      },
    );
    return { success: true, data };
  }

  @Get('orders/:id/modifications')
  @ApiOperation({ summary: 'Get modification requests for an order' })
  async getOrderModifications(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.modificationService.getModificationRequests(
      req.tenantId,
      { orderId, customerId: req.customerId },
      {
        page: parseInt(page ?? '1', 10),
        limit: parseInt(limit ?? '20', 10),
        sortOrder: 'desc',
      },
    );
    return { success: true, data };
  }

  // ─── Reorder ──────────────────────────────────────────────────

  @Post('reorder/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One-click reorder from a previous order' })
  async reorder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Query('templateId') templateId?: string,
  ) {
    const data = await this.reorderService.reorder(
      req.tenantId,
      req.customerId,
      orderId,
      templateId,
    );
    return { success: true, data };
  }

  @Get('reorder/history')
  @ApiOperation({ summary: 'Get past orders that can be reordered' })
  async getReorderableOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.reorderService.getReorderableOrders(
      req.tenantId,
      req.customerId,
      {
        page: parseInt(page ?? '1', 10),
        limit: parseInt(limit ?? '20', 10),
        sortOrder: 'desc',
      },
    );
    return { success: true, data };
  }
}
