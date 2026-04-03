import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth-store';
import { mapRoleToRouteGroup } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter email and password.');
      return;
    }

    clearError();
    try {
      await login({
        email: email.trim(),
        password,
        tenantSlug: tenantSlug.trim() || undefined,
      });

      const user = useAuthStore.getState().user;
      if (user) {
        const group = mapRoleToRouteGroup(user.role);
        switch (group) {
          case '(owner)':
            router.replace('/(owner)/dashboard');
            break;
          case '(sales)':
            router.replace('/(sales)/bill');
            break;
          case '(customer)':
            router.replace('/(customer)/home');
            break;
          case '(agent)':
            router.replace('/(agent)/collections');
            break;
        }
      }
    } catch (err) {
      // Error is set in store
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-primary-400 text-3xl font-bold">
              CaratFlow
            </Text>
            <Text className="text-surface-500 text-sm mt-1">
              Sign in to your account
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Form */}
          <Input
            label="Tenant"
            placeholder="Store name (optional)"
            value={tenantSlug}
            onChangeText={setTenantSlug}
            autoCapitalize="none"
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            size="lg"
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Text className="text-primary-500 text-sm text-center mt-4 font-medium">
              Forgot password?
            </Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
