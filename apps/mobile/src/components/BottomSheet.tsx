import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapHeight?: 'auto' | 'half' | 'full';
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapHeight = 'auto',
}: BottomSheetProps) {
  const heightClass =
    snapHeight === 'full'
      ? 'max-h-[90%]'
      : snapHeight === 'half'
        ? 'max-h-[50%]'
        : 'max-h-[80%]';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40" onPress={onClose} />
        <View
          className={`bg-white rounded-t-2xl ${heightClass}`}
        >
          {/* Handle bar */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 bg-surface-300 rounded-full" />
          </View>

          {title && (
            <View className="flex-row items-center justify-between px-4 pb-3 border-b border-surface-200">
              <Text className="text-lg font-semibold text-surface-900">
                {title}
              </Text>
              <Pressable onPress={onClose} className="p-2">
                <Text className="text-surface-500 font-bold">Close</Text>
              </Pressable>
            </View>
          )}

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
