import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  rightElement,
  ...textInputProps
}: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-surface-700 mb-1.5">
          {label}
        </Text>
      )}
      <View className="flex-row items-center">
        <TextInput
          className={`flex-1 border rounded-xl px-4 py-3 text-base text-surface-900 ${
            error
              ? 'border-red-400 bg-red-50'
              : 'border-surface-300 bg-surface-50 focus:border-primary-400'
          }`}
          placeholderTextColor="#adb5bd"
          {...textInputProps}
        />
        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}
