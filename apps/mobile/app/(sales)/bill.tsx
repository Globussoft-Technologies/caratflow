import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth-store';
import { BottomSheet } from '@/components/BottomSheet';
import { Input } from '@/components/Input';
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
  gstRate: number; // percent * 100
  lineTotalPaise: number;
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

export default function QuickBillScreen() {
  const { user, activeLocationId } = useAuthStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const { data: productResults, isLoading: productLoading } = useApiQuery<{
    items: ProductSearchResult[];
  }>(
    ['sales', 'product-search', searchQuery],
    '/api/v1/inventory/stock-items',
    { search: searchQuery, locationId: activeLocationId ?? undefined, limit: 20 },
    { enabled: searchQuery.length >= 2 },
  );

  const { data: customerResults } = useApiQuery<{
    items: Array<{ id: string; firstName: string; lastName: string; phone: string }>;
  }>(
    ['sales', 'customer-search', customerSearchQuery],
    '/api/v1/crm/customers',
    { search: customerSearchQuery, limit: 10 },
    { enabled: customerSearchQuery.length >= 2 },
  );

  const addToCart = (product: ProductSearchResult) => {
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.productId === product.id
            ? { ...c, quantity: c.quantity + 1, lineTotalPaise: c.unitPricePaise * (c.quantity + 1) }
            : c,
        ),
      );
    } else {
      const item: CartItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitPricePaise: product.sellingPricePaise,
        metalWeightMg: product.weightMg,
        metalRatePaise: 0,
        makingChargesPaise: 0,
        gstRate: 300,
        lineTotalPaise: product.sellingPricePaise,
      };
      setCart([...cart, item]);
    }
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

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
          <Text className={`text-sm ${customerName ? 'text-surface-900 font-medium' : 'text-surface-400'}`}>
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
              // Barcode scanner would open camera
              Alert.alert('Scanner', 'Barcode scanner will open the camera for scanning.');
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
                <Text className="text-sm font-semibold text-surface-900" numberOfLines={1}>
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
        {(productResults?.items ?? []).map((product) => (
          <Pressable
            key={product.id}
            className="py-3 border-b border-surface-100"
            onPress={() => addToCart(product)}
          >
            <Text className="text-sm font-medium text-surface-900">
              {product.name}
            </Text>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xs text-surface-500">
                {product.sku} | {product.productType} | Avail: {product.quantityAvailable}
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
        {(customerResults?.items ?? []).map((cust) => (
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
            <Text className="text-xs text-surface-500">{cust.phone}</Text>
          </Pressable>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}
