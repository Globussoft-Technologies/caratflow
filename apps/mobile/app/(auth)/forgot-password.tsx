import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { forgotPassword } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-primary-400 text-3xl font-bold">
            CaratFlow
          </Text>
          <Text className="text-surface-500 text-sm mt-1">
            Reset your password
          </Text>
        </View>

        {sent ? (
          <View className="items-center">
            <Text className="text-green-600 text-base font-medium text-center mb-4">
              Password reset email sent. Check your inbox.
            </Text>
            <Button
              title="Back to Login"
              onPress={() => router.back()}
              variant="secondary"
            />
          </View>
        ) : (
          <>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
            />

            <Button
              title="Back to Login"
              onPress={() => router.back()}
              variant="ghost"
              style={{ marginTop: 12 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
