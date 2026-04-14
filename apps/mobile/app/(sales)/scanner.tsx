// ─── Barcode Scanner Modal ───────────────────────────────────────
// Pushed onto the stack from POS/Bill or Stock screens. Writes the
// scanned value to the scan-store, then pops back so the caller can
// pick up the result via useScanStore.

import React from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useScanStore } from '@/store/scan-store';

export default function ScannerScreen() {
  const setResult = useScanStore((s) => s.setResult);

  const handleScanned = (data: string, type: string) => {
    setResult(data, type);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(sales)/bill');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Scan Barcode',
          presentation: 'modal',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <BarcodeScanner
        onScanned={handleScanned}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}
