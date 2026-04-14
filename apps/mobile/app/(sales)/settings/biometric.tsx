import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Alert, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import {
  DEFAULT_BIOMETRIC_SETTINGS,
  isBiometricAvailable,
  authenticateWithBiometric,
  loadBiometricSettings,
  saveBiometricSettings,
  type BiometricAvailability,
  type BiometricSettings,
  type BiometricType,
} from '@/lib/biometric';
import { decimalToPaise, paiseToDecimal, formatMoney } from '@/utils/money';

function typeLabel(type: BiometricType): string {
  switch (type) {
    case 'FaceID':
      return 'Face ID enabled';
    case 'Fingerprint':
      return 'Fingerprint enabled';
    case 'Iris':
      return 'Iris scan enabled';
    default:
      return 'Not available';
  }
}

export default function BiometricSettingsScreen() {
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    type: 'None',
  });
  const [settings, setSettings] = useState<BiometricSettings>(
    DEFAULT_BIOMETRIC_SETTINGS,
  );
  const [thresholdText, setThresholdText] = useState(
    paiseToDecimal(DEFAULT_BIOMETRIC_SETTINGS.thresholdPaise).toFixed(2),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [avail, stored] = await Promise.all([
        isBiometricAvailable(),
        loadBiometricSettings(),
      ]);
      if (!mounted) return;
      setAvailability(avail);
      setSettings(stored);
      setThresholdText(paiseToDecimal(stored.thresholdPaise).toFixed(2));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: BiometricSettings) => {
    setSaving(true);
    try {
      await saveBiometricSettings(next);
      setSettings(next);
    } finally {
      setSaving(false);
    }
  }, []);

  const onToggle = async (value: boolean) => {
    if (value && !availability.available) {
      Alert.alert(
        'Biometric unavailable',
        'This device does not have biometric hardware enrolled. Please enrol Face ID or a fingerprint in device settings.',
      );
      return;
    }
    await persist({ ...settings, enabled: value });
  };

  const onThresholdBlur = async () => {
    const decimal = parseFloat(thresholdText);
    if (Number.isNaN(decimal) || decimal < 0) {
      setThresholdText(paiseToDecimal(settings.thresholdPaise).toFixed(2));
      return;
    }
    const paise = decimalToPaise(decimal);
    await persist({ ...settings, thresholdPaise: paise });
    setThresholdText(paiseToDecimal(paise).toFixed(2));
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const result = await authenticateWithBiometric(
        'Test biometric authentication',
      );
      if (result.success) {
        Alert.alert('Success', 'Biometric authentication succeeded.');
      } else {
        Alert.alert(
          'Failed',
          `Authentication failed${result.error ? `: ${result.error}` : ''}.`,
        );
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Biometric' }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        testID="biometric-settings-scroll"
      >
        <Card className="mb-4">
          <Text className="text-sm text-surface-500 mb-1">Device status</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-surface-900">
              {typeLabel(availability.type)}
            </Text>
            <Badge
              label={availability.available ? 'Ready' : 'Unavailable'}
              variant={availability.available ? 'success' : 'warning'}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 pr-4">
              <Text className="text-base font-semibold text-surface-900">
                Require biometric for high-value sales
              </Text>
              <Text className="text-xs text-surface-500 mt-1">
                Sales at or above the threshold will prompt for Face ID,
                fingerprint or the device passcode before completing.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={onToggle}
              disabled={saving}
              testID="biometric-toggle"
            />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Threshold amount
          </Text>
          <Input
            label="Amount in INR"
            placeholder="50000.00"
            keyboardType="decimal-pad"
            value={thresholdText}
            onChangeText={setThresholdText}
            onBlur={onThresholdBlur}
            testID="biometric-threshold-input"
          />
          <Text className="text-xs text-surface-500">
            Current: {formatMoney(settings.thresholdPaise)}
          </Text>
        </Card>

        <Pressable>
          <Button
            title={testing ? 'Authenticating…' : 'Test biometric'}
            onPress={onTest}
            loading={testing}
            disabled={!availability.available}
            variant="secondary"
            size="lg"
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
