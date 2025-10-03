import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
// 탭 버튼을 누를 때 햅틱 피드백을 주는 커스텀 컴포넌트

import { IconSymbol } from '@/components/ui/icon-symbol';
// iOS 스타일 심볼 아이콘을 보여주는 컴포넌트

import { Colors } from '@/constants/theme';
// 라이트/다크 모드별 색상 테마 정의

import { useColorScheme } from '@/hooks/use-color-scheme';
// 현재 시스템 색상 모드(light/dark)를 감지하는 커스텀 훅

export default function TabLayout() {
  // 현재 디바이스의 라이트/다크 모드 상태를 가져옴
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // 탭 아이템이 활성화되었을 때의 색상 (테마에 따라 다름)
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,

        // 상단 헤더는 숨김
        headerShown: false,

        // 탭 버튼을 눌렀을 때 HapticTab 컴포넌트를 사용하여 진동 효과 제공
        tabBarButton: HapticTab,
      }}
    >
      {/* 첫 번째 탭: 홈 화면 (index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home', // 탭에 표시될 이름
          // 탭 아이콘: 집 모양
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* 두 번째 탭: 탐색 화면 (explore.tsx) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore', // 탭에 표시될 이름
          // 탭 아이콘: 비행기 모양
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />

      {/*
        글 작성(new-post.tsx)과 글 상세(post/[id].tsx)는
        탭에는 표시하지 않으려면 여기서 추가 설정 필요:
        <Tabs.Screen name="new-post" options={{ href: null }} />
        <Tabs.Screen name="post/[id]" options={{ href: null }} />
      */}
    </Tabs>
  );
}
