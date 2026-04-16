// ─── Owner Settings ───────────────────────────────────────────
// Rate-update uses the real tRPC procedure india.rates.record.
// The task spec referenced `india.rates.setRate({ metalType, purity,
// pricePerGramPaise })` but the backend procedure is `record` and
// takes the full MetalRateInputSchema (rates per gram / 10g / tola /
// troy-oz + source + recordedAt). We compute the derived rates here
// using the standard conversions (1 tola = 11.664g, 1 troy oz =
// 31.1035g) and stamp source=MANUAL with the current timestamp.
//
// TODO: if a lean `india.rates.setRate` procedure is added server-side
// later, swap this mutation for it -- a single (metalType, purity,
// ratePerGramPaise) call would be cleaner than computing derived units
// on the client.

import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { trpc } from '@/lib/trpc';

/** Derive per-unit rates from a per-gram paise rate. */
function deriveRates(ratePerGramPaise: number) {
  return {
    ratePerGramPaise: Math.round(ratePerGramPaise),
    ratePer10gPaise: Math.round(ratePerGramPaise * 10),
    ratePerTolaPaise: Math.round(ratePerGramPaise * 11.664),
    ratePerTroyOzPaise: Math.round(ratePerGramPaise * 31.1035),
  };
}

export default function SettingsScreen() {
  const { user, logout, activeLocationName } = useAuthStore();
  const { weightUnit, setWeightUnit } = useAppStore();

  const [goldRate, setGoldRate] = useState('');
  const [silverRate, setSilverRate] = useState('');

  const utils = trpc.useUtils();
  const recordRate = trpc.india.rates.record.useMutation({
    onSuccess: async () => {
      // Invalidate any cached rate queries so other screens see the
      // new values immediately.
      await utils.india.rates.getAll.invalidate().catch(() => {});
      await utils.india.rates.getCurrent.invalidate().catch(() => {});
    },
  });

  const submitting = recordRate.isPending;

  const handleUpdateRates = async () => {
    const goldRupees = parseFloat(goldRate);
    const silverRupees = parseFloat(silverRate);
    const hasGold = !Number.isNaN(goldRupees) && goldRupees > 0;
    const hasSilver = !Number.isNaN(silverRupees) && silverRupees > 0;

    if (!hasGold && !hasSilver) {
      Alert.alert('Validation', 'Please enter at least one rate.');
      return;
    }

    // Input is rupees per 10 grams. Convert to paise per gram.
    const nowIso = new Date().toISOString();

    try {
      if (hasGold) {
        const goldPerGramPaise = Math.round((goldRupees * 100) / 10);
        await recordRate.mutateAsync({
          metalType: 'GOLD',
          purity: 999,
          ...deriveRates(goldPerGramPaise),
          source: 'MANUAL' as never,
          recordedAt: nowIso as unknown as Date,
        });
      }
      if (hasSilver) {
        const silverPerGramPaise = Math.round((silverRupees * 100) / 10);
        await recordRate.mutateAsync({
          metalType: 'SILVER',
          purity: 999,
          ...deriveRates(silverPerGramPaise),
          source: 'MANUAL' as never,
          recordedAt: nowIso as unknown as Date,
        });
      }
      Alert.alert('Success', 'Rates updated successfully.');
      setGoldRate('');
      setSilverRate('');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update rates',
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-surface-900 mb-6">
          Settings
        </Text>

        {/* Profile */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-2">
            Account
          </Text>
          <Text className="text-base font-semibold text-surface-900">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-sm text-surface-600">{user?.email}</Text>
          <Text className="text-xs text-surface-400 mt-1">
            Role: {user?.role} | Location: {activeLocationName ?? 'Not set'}
          </Text>
        </Card>

        {/* Rate Entry */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-3">
            Update Today's Rates
          </Text>
          <Input
            label="Gold Rate (per 10g, 999)"
            placeholder="e.g., 62500.00"
            value={goldRate}
            onChangeText={setGoldRate}
            keyboardType="decimal-pad"
          />
          <Input
            label="Silver Rate (per 10g, 999)"
            placeholder="e.g., 750.00"
            value={silverRate}
            onChangeText={setSilverRate}
            keyboardType="decimal-pad"
          />
          <Button
            title="Update Rates"
            onPress={handleUpdateRates}
            loading={submitting}
            size="md"
          />
        </Card>

        {/* Preferences */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-3">
            Preferences
          </Text>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm text-surface-700">Weight Unit</Text>
            <View className="flex-row gap-1">
              {(['g', 'tola', 'ct'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setWeightUnit(u)}
                  className={`px-3 py-1.5 rounded-lg ${
                    weightUnit === u ? 'bg-primary-400' : 'bg-surface-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      weightUnit === u ? 'text-white' : 'text-surface-700'
                    }`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {/* About */}
        <Card className="mb-4">
          <Text className="text-xs text-surface-500 uppercase tracking-wide mb-2">
            About
          </Text>
          <Text className="text-sm text-surface-700">CaratFlow Mobile</Text>
          <Text className="text-xs text-surface-400">Version 0.1.0</Text>
        </Card>

        {/* Logout */}
        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleLogout}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
