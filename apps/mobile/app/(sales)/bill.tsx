import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth-store';
import { useScanStore } from '@/store/scan-store';
import { BottomSheet } from '@/components/BottomSheet';
import { DataList } from '@/components/DataList';
import { formatMoney } from '@/utils/money';

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  metalWeightMg: number;
  metalRatePaise: number;
  makingChargesPaise: number;
  hsnCode: string;
  gstRate: number; // percent * 100
  lineTotalPaise: number;
}

// Shape of items returned by trpc.inventory.stockItems.list (mapStockItemResponse).
// The list shape includes a flattened product nested object; we project the
// fields we need into a search-result type for the bill UI.
interface StockItemListRow {
  id: string;
  productId: string;
  quantityOnHand: number;
  quantityAvailable: number;
  product?: {
    id: string;
    sku: string;
    name: string;
    productType: string;
    sellingPricePaise: number | null;
    costPricePaise: number | null;
  };
  location?: { id: string; name: string };
}

interface ProductSearchResult {
  id: string;
  sku: string;
  name: string;
  productType: string;
  sellingPricePaise: number;
  weightMg: number;
  purityFineness: number;
  quantityAvailable: number;
  locationName: string;
}

interface CustomerListRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email?: string | null;
}

// India default HSN for jewellery; matches inventoryService.getProductWithStock
// and the financial.tax.computeGst defaults.
const DEFAULT_HSN_CODE = '7113';
const DEFAULT_GST_RATE = 300; // 3% * 100
// Mobile auth store does not yet expose location/customer state. Use the same
// MH/MH intra-state default as the API server when state info is missing —
// the server-side createSale recomputes GST authoritatively from the line
// items, so this client-side preview is for display only.
const DEFAULT_STATE = 'MH';

export default function QuickBillScreen() {
  const { activeLocationId } = useAuthStore();
  const consumeScan = useScanStore((s) => s.consume);
  const requestScan = useScanStore((s) => s.request);
  const scanIntent = useScanStore((s) => s.intent);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // ─── tRPC: product (stock-item) search ─────────────────────────
  // inventory.stockItems.list returns items keyed by stock-item id, with the
  // product nested. Map to a flat ProductSearchResult for the existing UI.
  const { data: stockItemsData, isLoading: productLoading } =
    trpc.inventory.stockItems.list.useQuery(
      {
        search: searchQuery || undefined,
        locationId: activeLocationId ?? undefined,
        limit: 20,
      },
      { enabled: searchQuery.length >= 2 },
    );

  const productResults: ProductSearchResult[] = (
    ((stockItemsData as { items?: StockItemListRow[] } | undefined)?.items ??
      []) as StockItemListRow[]
  )
    .filter((it) => !!it.product)
    .map((it) => ({
      id: it.product!.id,
      sku: it.product!.sku,
      name: it.product!.name,
      productType: it.product!.productType,
      sellingPricePaise: Number(it.product!.sellingPricePaise ?? 0),
      // The list response does not include weightMg/purityFineness on the
      // projected product; default to 0 and let the user see metalRatePaise
      // pulled from the dedicated product detail when adding to cart.
      weightMg: 0,
      purityFineness: 0,
      quantityAvailable: it.quantityAvailable ?? it.quantityOnHand ?? 0,
      locationName: it.location?.name ?? '',
    }));

  // ─── tRPC: customer search ─────────────────────────────────────
  const { data: customersData } = trpc.crm.customerList.useQuery(
    { search: customerSearchQuery || undefined, limit: 10 },
    { enabled: customerSearchQuery.length >= 2 },
  );

  const customerResults: CustomerListRow[] =
    ((customersData as { items?: CustomerListRow[] } | undefined)?.items ??
      []) as CustomerListRow[];

  // ─── tRPC utils — used to imperatively fetch product detail (for
  // metalRatePaise + makingCharges) and the GST bracket per line item.
  const utils = trpc.useUtils();

  const addToCart = useCallback(
    async (product: ProductSearchResult) => {
      const existing = cart.find((c) => c.productId === product.id);
      if (existing) {
        setCart((prev) =>
          prev.map((c) =>
            c.productId === product.id
              ? {
                  ...c,
                  quantity: c.quantity + 1,
                  lineTotalPaise: c.unitPricePaise * (c.quantity + 1),
                }
              : c,
          ),
        );
        setShowProductSearch(false);
        setSearchQuery('');
        return;
      }

      // Pull authoritative pricing components from the product detail. The
      // list response only carries sellingPricePaise; the detail endpoint
      // gives us weight, hsnCode and metal-rate inputs needed for tax.
      let metalRatePaise = 0;
      let makingChargesPaise = 0;
      let metalWeightMg = product.weightMg;
      let hsnCode = DEFAULT_HSN_CODE;
      try {
        const detail = (await utils.inventory.products.getWithStock.fetch({
          productId: product.id,
        })) as {
          product?: {
            weightMg?: number;
            costPricePaise?: number;
            sellingPricePaise?: number;
            hsnCode?: string;
          };
        };
        metalWeightMg = detail.product?.weightMg ?? metalWeightMg;
        // Approximate metalRatePaise as the cost component and makingCharges
        // as the markup. The server-side createSale recomputes from current
        // metal rates if these are zero — this is a best-effort preview.
        const cost = Number(detail.product?.costPricePaise ?? 0);
        const sell = Number(
          detail.product?.sellingPricePaise ?? product.sellingPricePaise,
        );
        metalRatePaise = cost;
        makingChargesPaise = Math.max(0, sell - cost);
        hsnCode = detail.product?.hsnCode ?? DEFAULT_HSN_CODE;
      } catch {
        // Detail fetch failure is non-fatal for the preview; fall back to
        // sellingPrice with no breakdown and the default HSN.
      }

      // Resolve the GST bracket for this HSN via the tax service.
      let gstRate = DEFAULT_GST_RATE;
      try {
        const gst = (await utils.financial.tax.computeGst.fetch({
          taxableAmountPaise: product.sellingPricePaise,
          hsnCode,
          gstRate: DEFAULT_GST_RATE,
          sourceState: DEFAULT_STATE,
          destState: DEFAULT_STATE,
        })) as { cgstRate: number; sgstRate: number; igstRate: number };
        gstRate = gst.cgstRate + gst.sgstRate + gst.igstRate;
        if (!gstRate) gstRate = DEFAULT_GST_RATE;
      } catch {
        // computeGst failure → keep the jewellery default of 3%.
      }

      const item: CartItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitPricePaise: product.sellingPricePaise,
        metalWeightMg,
        metalRatePaise,
        makingChargesPaise,
        hsnCode,
        gstRate,
        lineTotalPaise: product.sellingPricePaise,
      };
      setCart((prev) => [...prev, item]);
      setShowProductSearch(false);
      setSearchQuery('');
    },
    [cart, utils],
  );

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  // ─── Scanner integration ────────────────────────────────────────
  // When the user taps Scan Barcode we record an intent in the scan-store
  // and push the modal scanner. On focus return, consume any pending result
  // and surface it through the product search query so it auto-filters.
  useFocusEffect(
    useCallback(() => {
      if (scanIntent !== 'pos-product') return;
      const scanned = consumeScan();
      if (scanned?.data) {
        setSearchQuery(scanned.data);
        setShowProductSearch(true);
      }
    }, [scanIntent, consumeScan]),
  );

  const cartTotal = cart.reduce((sum, c) => sum + c.lineTotalPaise, 0);
  const taxTotal = cart.reduce(
    (sum, c) => sum + Math.round((c.lineTotalPaise * c.gstRate) / 10000),
    0,
  );
  const grandTotal = cartTotal + taxTotal;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900">Quick Bill</Text>
      </View>

      {/* Customer Selection */}
      <View className="px-4 mb-2">
        <Pressable
          onPress={() => setShowCustomerSearch(true)}
          className="flex-row items-center justify-between bg-white border border-surface-200 rounded-xl px-4 py-3"
        >
          <Text
            className={`text-sm ${
              customerName
                ? 'text-surface-900 font-medium'
                : 'text-surface-400'
            }`}
          >
            {customerName ?? 'Select customer (optional)'}
          </Text>
          {customerName && (
            <Pressable
              onPress={() => {
                setCustomerId(null);
                setCustomerName(null);
              }}
            >
              <Text className="text-xs text-red-500">Clear</Text>
            </Pressable>
          )}
        </Pressable>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2 px-4 mb-3">
        <View className="flex-1">
          <Button
            title="Scan Barcode"
            variant="secondary"
            size="sm"
            onPress={() => {
              requestScan('pos-product');
              router.push('/(sales)/scanner');
            }}
          />
        </View>
        <View className="flex-1">
          <Button
            title="Search Product"
            variant="secondary"
            size="sm"
            onPress={() => setShowProductSearch(true)}
          />
        </View>
      </View>

      {/* Cart Items */}
      <DataList
        data={cart}
        keyExtractor={(item) => item.productId}
        emptyTitle="No items in cart"
        emptySubtitle="Scan a barcode or search for products to add"
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Card className="mb-2">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text
                  className="text-sm font-semibold text-surface-900"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-xs text-surface-500">
                  SKU: {item.sku} | Qty: {item.quantity}
                </Text>
                {item.metalWeightMg > 0 && (
                  <WeightDisplay
                    milligrams={item.metalWeightMg}
                    className="text-xs text-surface-500"
                  />
                )}
              </View>
              <View className="items-end">
                <MoneyDisplay
                  amountPaise={item.lineTotalPaise}
                  className="text-sm font-semibold text-surface-900"
                />
                <Pressable onPress={() => removeFromCart(item.productId)}>
                  <Text className="text-xs text-red-500 mt-1">Remove</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        )}
      />

      {/* Cart Summary & Proceed */}
      {cart.length > 0 && (
        <View className="bg-white border-t border-surface-200 px-4 py-3 pb-6">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-surface-600">Subtotal</Text>
            <MoneyDisplay
              amountPaise={cartTotal}
              className="text-sm text-surface-700"
            />
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-surface-600">Tax (GST)</Text>
            <MoneyDisplay
              amountPaise={taxTotal}
              className="text-sm text-surface-700"
            />
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-lg font-bold text-surface-900">Total</Text>
            <MoneyDisplay
              amountPaise={grandTotal}
              className="text-lg font-bold text-primary-500"
            />
          </View>
          <Button
            title={`Proceed to Payment (${formatMoney(grandTotal)})`}
            onPress={() =>
              router.push({
                pathname: '/(sales)/bill/payment',
                params: {
                  total: String(grandTotal),
                  cart: JSON.stringify(cart),
                  customerId: customerId ?? '',
                },
              })
            }
            size="lg"
          />
        </View>
      )}

      {/* Product Search Bottom Sheet */}
      <BottomSheet
        visible={showProductSearch}
        onClose={() => {
          setShowProductSearch(false);
          setSearchQuery('');
        }}
        title="Search Products"
        snapHeight="full"
      >
        <SearchBar
          placeholder="Search by name, SKU, or barcode..."
          onSearch={setSearchQuery}
          autoFocus
        />
        {productResults.map((product) => (
          <Pressable
            key={product.id}
            className="py-3 border-b border-surface-100"
            onPress={() => {
              void addToCart(product);
            }}
          >
            <Text className="text-sm font-medium text-surface-900">
              {product.name}
            </Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-surface-500">
                {product.sku} | {product.productType} | Avail:{' '}
                {product.quantityAvailable}
              </Text>
              <MoneyDisplay
                amountPaise={product.sellingPricePaise}
                className="text-sm font-semibold text-primary-500"
              />
            </View>
          </Pressable>
        ))}
      </BottomSheet>

      {/* Customer Search Bottom Sheet */}
      <BottomSheet
        visible={showCustomerSearch}
        onClose={() => {
          setShowCustomerSearch(false);
          setCustomerSearchQuery('');
        }}
        title="Select Customer"
      >
        <SearchBar
          placeholder="Search by name or phone..."
          onSearch={setCustomerSearchQuery}
          autoFocus
        />
        {customerResults.map((cust) => (
          <Pressable
            key={cust.id}
            className="py-3 border-b border-surface-100"
            onPress={() => {
              setCustomerId(cust.id);
              setCustomerName(`${cust.firstName} ${cust.lastName}`);
              setShowCustomerSearch(false);
              setCustomerSearchQuery('');
            }}
          >
            <Text className="text-sm font-medium text-surface-900">
              {cust.firstName} {cust.lastName}
            </Text>
            <Text className="text-xs text-surface-500">
              {cust.phone ?? ''}
            </Text>
          </Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}
