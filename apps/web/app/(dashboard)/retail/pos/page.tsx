'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { ShoppingCart, User, Printer } from 'lucide-react';
import { PosProductSearch } from '../../../../src/features/retail/PosProductSearch';
import { PosCart, type CartItem } from '../../../../src/features/retail/PosCart';
import { PosPaymentDialog } from '../../../../src/features/retail/PosPaymentDialog';
import { MetalRateDisplay } from '../../../../src/features/retail/MetalRateDisplay';

// Mock data -- in production these come from tRPC queries
const MOCK_PRODUCTS = [
  { id: 'p1', sku: 'GN-001', name: '22K Gold Necklace - Lakshmi', productType: 'GOLD', metalWeightMg: 15000, metalPurity: 916, makingCharges: 250000, sellingPricePaise: 9500000 },
  { id: 'p2', sku: 'GR-001', name: '22K Gold Ring - Classic', productType: 'GOLD', metalWeightMg: 5000, metalPurity: 916, makingCharges: 80000, sellingPricePaise: 3200000 },
  { id: 'p3', sku: 'GB-001', name: '22K Gold Bangle - Pair', productType: 'GOLD', metalWeightMg: 25000, metalPurity: 916, makingCharges: 400000, sellingPricePaise: 16000000 },
  { id: 'p4', sku: 'SE-001', name: 'Silver Earrings - Jhumka', productType: 'SILVER', metalWeightMg: 8000, metalPurity: 925, makingCharges: 15000, sellingPricePaise: 350000 },
  { id: 'p5', sku: 'DE-001', name: 'Diamond Pendant - Solitaire', productType: 'DIAMOND', metalWeightMg: 3000, metalPurity: 750, makingCharges: 500000, sellingPricePaise: 25000000 },
];

const GOLD_RATE_PAISE_PER_GRAM = 6500_00; // Rs 6,500/g
const SILVER_RATE_PAISE_PER_GRAM = 82_00; // Rs 82/g

export default function PosPage() {
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<{ id: string; name: string } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const addToCart = (product: (typeof MOCK_PRODUCTS)[0]) => {
    const existing = cartItems.find((i) => i.productId === product.id);
    if (existing) {
      updateQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const rate = product.productType === 'GOLD' ? GOLD_RATE_PAISE_PER_GRAM : SILVER_RATE_PAISE_PER_GRAM;
    const metalWeightMg = product.metalWeightMg ?? 0;
    const metalValuePaise = Math.round((metalWeightMg / 1000) * rate);
    const makingChargesPaise = product.makingCharges ?? 0;
    const unitPricePaise = metalValuePaise + makingChargesPaise;
    const taxableAmount = unitPricePaise;

    // 3% GST intra-state: 1.5% CGST + 1.5% SGST
    const cgstPaise = Math.round((taxableAmount * 1.5) / 100);
    const sgstPaise = Math.round((taxableAmount * 1.5) / 100);
    const lineTotalPaise = taxableAmount + cgstPaise + sgstPaise;

    const newItem: CartItem = {
      id: `cart-${Date.now()}`,
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPricePaise,
      metalWeightMg,
      metalRatePaise: rate,
      makingChargesPaise,
      wastageChargesPaise: 0,
      discountPaise: 0,
      hsnCode: '7113',
      gstRate: 300,
      cgstPaise,
      sgstPaise,
      igstPaise: 0,
      lineTotalPaise,
    };

    setCartItems((prev) => [...prev, newItem]);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const taxableAmount = item.unitPricePaise * quantity - item.discountPaise;
        const cgstPaise = Math.round((taxableAmount * 1.5) / 100);
        const sgstPaise = Math.round((taxableAmount * 1.5) / 100);
        return {
          ...item,
          quantity,
          cgstPaise,
          sgstPaise,
          lineTotalPaise: taxableAmount + cgstPaise + sgstPaise,
        };
      }),
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const subtotalPaise = cartItems.reduce((sum, i) => sum + i.unitPricePaise * i.quantity - i.discountPaise, 0);
  const taxPaise = cartItems.reduce((sum, i) => sum + i.cgstPaise + i.sgstPaise + i.igstPaise, 0);
  const discountPaise = 0; // Would come from applied discount
  const beforeRoundOff = subtotalPaise - discountPaise + taxPaise;
  const totalPaise = Math.round(beforeRoundOff / 100) * 100;

  const handleCompleteSale = async (payments: Array<{ method: string; amountPaise: number; reference?: string }>) => {
    setIsProcessing(true);
    try {
      // In production: call retail.createSale mutation via tRPC
      console.log('Creating sale:', {
        customerId: selectedCustomer?.id,
        locationId: 'location-uuid',
        lineItems: cartItems.map((item) => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPricePaise: item.unitPricePaise,
          metalRatePaise: item.metalRatePaise,
          metalWeightMg: item.metalWeightMg,
          makingChargesPaise: item.makingChargesPaise,
          wastageChargesPaise: item.wastageChargesPaise,
          hsnCode: item.hsnCode,
          gstRate: item.gstRate,
        })),
        payments,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset cart
      setCartItems([]);
      setSelectedCustomer(null);
      setPaymentDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">POS</h1>
          <MetalRateDisplay
            metalType="Gold 22K"
            ratePaisePerGram={GOLD_RATE_PAISE_PER_GRAM}
            className="hidden sm:block"
          />
          <MetalRateDisplay
            metalType="Silver"
            ratePaisePerGram={SILVER_RATE_PAISE_PER_GRAM}
            className="hidden sm:block"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedCustomer ? (
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
            >
              <User className="h-3.5 w-3.5" />
              {selectedCustomer.name}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedCustomer({ id: 'cust-1', name: 'Walk-in Customer' })}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <User className="h-3.5 w-3.5" />
              Select Customer
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product Search + Grid */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <PosProductSearch
            products={MOCK_PRODUCTS}
            onSelect={addToCart}
          />

          {/* Product Quick Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MOCK_PRODUCTS.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="rounded-lg border p-3 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="text-xs font-mono text-muted-foreground">{product.sku}</div>
                <div className="mt-1 text-sm font-medium line-clamp-2">{product.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {product.metalWeightMg ? `${(product.metalWeightMg / 1000).toFixed(3)}g` : ''}
                  {product.metalPurity ? ` | ${product.metalPurity}` : ''}
                </div>
                <div className="mt-1 text-sm font-semibold text-primary">
                  ₹{(product.sellingPricePaise / 100).toLocaleString('en-IN')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-96 border-l flex flex-col">
          <PosCart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            subtotalPaise={subtotalPaise}
            discountPaise={discountPaise}
            taxPaise={taxPaise}
            totalPaise={totalPaise}
          />

          {/* Action Buttons */}
          <div className="border-t p-3 space-y-2">
            <button
              type="button"
              onClick={() => setPaymentDialogOpen(true)}
              disabled={cartItems.length === 0}
              className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <ShoppingCart className="mr-2 inline-block h-4 w-4" />
              Charge {totalPaise > 0 ? `₹${(totalPaise / 100).toLocaleString('en-IN')}` : ''}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCartItems([])}
                disabled={cartItems.length === 0}
                className="flex-1 rounded-md border py-2 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                Clear Cart
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border py-2 text-xs font-medium hover:bg-accent"
              >
                <Printer className="mr-1 inline-block h-3 w-3" />
                Hold
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <PosPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        totalPaise={totalPaise}
        onConfirm={handleCompleteSale}
        isProcessing={isProcessing}
      />
    </div>
  );
}
