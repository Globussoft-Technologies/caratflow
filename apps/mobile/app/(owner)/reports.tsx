import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/Card';

interface ReportCard {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: string;
}

const reportCards: ReportCard[] = [
  {
    id: 'sales',
    title: 'Sales Summary',
    subtitle: 'Revenue, top products, sales trends',
    route: '/(owner)/reports/sales',
    icon: '\uD83D\uDCB0',
  },
  {
    id: 'inventory',
    title: 'Stock Value',
    subtitle: 'Inventory value by category, low stock',
    route: '/(owner)/reports/inventory',
    icon: '\uD83D\uDCE6',
  },
  {
    id: 'payments',
    title: 'Outstanding Payments',
    subtitle: 'AR/AP aging, collection status',
    route: '/(owner)/reports/sales',
    icon: '\uD83D\uDCCB',
  },
  {
    id: 'karigar',
    title: 'Karigar Performance',
    subtitle: 'Job completion, wastage, utilization',
    route: '/(owner)/reports/inventory',
    icon: '\u2692\uFE0F',
  },
];

export default function ReportsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-surface-900 mb-1">
          Reports
        </Text>
        <Text className="text-sm text-surface-500 mb-6">
          Quick access to key business reports
        </Text>

        {reportCards.map((report) => (
          <Card
            key={report.id}
            className="mb-3"
            onPress={() => router.push(report.route as never)}
          >
            <View className="flex-row items-center">
              <Text className="text-2xl mr-4">{report.icon}</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-surface-900">
                  {report.title}
                </Text>
                <Text className="text-sm text-surface-500">
                  {report.subtitle}
                </Text>
              </View>
              <Text className="text-surface-400 text-lg">{'>'}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
