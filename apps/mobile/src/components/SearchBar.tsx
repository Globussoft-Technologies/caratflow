import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (text: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onSearch(text), debounceMs);
    },
    [onSearch, debounceMs],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    setValue(text);
    debouncedSearch(text);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <View className="flex-row items-center bg-surface-100 rounded-xl px-4 py-2.5 mb-3">
      <Text className="text-surface-400 mr-2 text-base">&#x1F50D;</Text>
      <TextInput
        className="flex-1 text-base text-surface-900"
        placeholder={placeholder}
        placeholderTextColor="#adb5bd"
        value={value}
        onChangeText={handleChange}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} className="ml-2 p-1">
          <Text className="text-surface-500 text-sm font-bold">X</Text>
        </Pressable>
      )}
    </View>
  );
}
