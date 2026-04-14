// ─── Barcode Scanner ─────────────────────────────────────────────
// Expo Camera based barcode scanner used by Sales POS and Stock check.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

export interface BarcodeScannerProps {
  onScanned: (data: string, type: string) => void;
  onClose?: () => void;
  /** When true, scanning is paused so a single tap doesn't re-fire. */
  paused?: boolean;
}

const BARCODE_TYPES = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code39',
  'code93',
  'code128',
  'pdf417',
  'itf14',
  'datamatrix',
] as const;

export function BarcodeScanner({ onScanned, onClose, paused }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned || paused) return;
      setScanned(true);
      onScanned(result.data, result.type);
    },
    [onScanned, paused, scanned],
  );

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#d4af37" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-center text-base mb-4">
          Camera permission is required to scan barcodes.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-primary-500 px-5 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
        {onClose && (
          <Pressable onPress={onClose} className="mt-3">
            <Text className="text-surface-300 text-sm">Cancel</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={paused ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
      >
        {/* Scan window overlay */}
        <View className="flex-1 items-center justify-center">
          <View
            style={{
              width: 260,
              height: 260,
              borderColor: '#d4af37',
              borderWidth: 3,
              borderRadius: 16,
              backgroundColor: 'transparent',
            }}
          />
          <Text className="text-white text-sm mt-4">
            Align barcode within the frame
          </Text>
        </View>

        <View className="absolute top-12 right-4 flex-row gap-2">
          {scanned && (
            <Pressable
              onPress={() => setScanned(false)}
              className="bg-primary-500 px-4 py-2 rounded-full"
            >
              <Text className="text-white text-xs font-semibold">Scan Again</Text>
            </Pressable>
          )}
          {onClose && (
            <Pressable
              onPress={onClose}
              className="bg-black/60 px-4 py-2 rounded-full"
            >
              <Text className="text-white text-xs font-semibold">Close</Text>
            </Pressable>
          )}
        </View>
      </CameraView>
    </View>
  );
}
