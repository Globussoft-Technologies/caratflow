import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface TabConfig {
  label: string;
  icon: string; // Unicode emoji as simple icon
}

interface CustomTabBarProps extends BottomTabBarProps {
  tabs: TabConfig[];
}

export function TabBar({ state, descriptors, navigation, tabs }: CustomTabBarProps) {
  return (
    <View className="flex-row bg-white border-t border-surface-200 pb-6 pt-2 px-2">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const tab = tabs[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center py-1"
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <Text className={`text-xl ${isFocused ? '' : 'opacity-40'}`}>
              {tab?.icon ?? '?'}
            </Text>
            <Text
              className={`text-[10px] mt-0.5 font-medium ${
                isFocused ? 'text-primary-500' : 'text-surface-500'
              }`}
            >
              {tab?.label ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
