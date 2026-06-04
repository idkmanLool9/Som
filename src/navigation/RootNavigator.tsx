import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import AccountScreen from '../screens/AccountScreen';
import CalculatorScreen from '../screens/CalculatorScreen';
import GradesScreen from '../screens/GradesScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';
import { colors } from '../theme';
import type { GradesStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const GradesStack = createNativeStackNavigator<GradesStackParamList>();

function GradesNavigator() {
  return (
    <GradesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}
    >
      <GradesStack.Screen
        name="GradesList"
        component={GradesScreen}
        options={{ headerShown: false }}
      />
      <GradesStack.Screen
        name="SubjectDetail"
        component={SubjectDetailScreen}
        options={{ title: 'Vak' }}
      />
    </GradesStack.Navigator>
  );
}

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Cijfers"
        component={GradesNavigator}
        options={{ tabBarIcon: tabIcon('📊') }}
      />
      <Tab.Screen
        name="Berekenen"
        component={CalculatorScreen}
        options={{ tabBarIcon: tabIcon('🧮') }}
      />
      <Tab.Screen
        name="Huiswerk"
        component={HomeworkScreen}
        options={{ tabBarIcon: tabIcon('📚') }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}
