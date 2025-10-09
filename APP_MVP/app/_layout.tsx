/**
 * app/_layout.tsx
 * 
 * Expo Router의 최상위 레이아웃 파일로,
 * 앱 전체의 화면 전환(Stack), 사용자 인증 상태 관리,
 * Toast 메시지 표시, 제스처 인식 컨텍스트를 담당한다.
 * 
 * 이 레벨에서 GestureHandlerRootView로 앱 전체를 감싸야
 * Swipeable, PanGestureHandler 등 제스처 관련 컴포넌트들이
 * 하위 트리에서 정상적으로 동작한다.
 */

import React, { useEffect, useState } from "react";
import { Stack } from "expo-router"; // 화면 전환용 Stack 네비게이터
import { onAuthStateChanged, User } from "firebase/auth"; // Firebase 인증 모듈
import { auth } from "../firebase"; // Firebase 설정 파일
import Toast from "react-native-toast-message"; // Toast 메시지 라이브러리
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // 제스처 인식 컨텍스트 제공

export default function RootLayout() {
  // Firebase 로그인 사용자 상태
  const [user, setUser] = useState<User | null>(null);

  // 초기 로딩 상태 (Splash 화면 표시용)
  const [loading, setLoading] = useState(true);

  /**
   * Firebase Auth 상태 구독
   * - onAuthStateChanged는 로그인/로그아웃 여부를 실시간으로 감지한다.
   * - user 객체가 존재하면 로그인 상태, 없으면 비로그인 상태로 처리한다.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe; // 언마운트 시 리스너 해제
  }, []);

  /**
   * 앱 초기 로딩 화면 (Splash)
   * - Firebase 인증 상태를 확인하는 동안 잠시 표시된다.
   * - 단순 로고 + ActivityIndicator로 구성.
   */
  if (loading) {
    return (
      <View style={styles.splash}>
        <Image
          source={require("../assets/images/react-logo.png")}
          style={{ width: 80, height: 80, marginBottom: 20 }}
        />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  /**
   * 메인 렌더링 부분
   * 
   * GestureHandlerRootView:
   * - react-native-gesture-handler의 모든 제스처 컴포넌트가
   *   하위에서 인식될 수 있도록 컨텍스트를 제공한다.
   * 
   * Stack:
   * - Expo Router의 Stack Navigator로, 화면 전환을 담당한다.
   * - 로그인 상태에 따라 서로 다른 화면 그룹을 보여준다.
   */
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          // 로그인된 상태
          // (tabs) 폴더 하위의 탭 네비게이션을 표시
          <Stack.Screen name="(tabs)" />
        ) : (
          // 비로그인 상태
          // 로그인 / 회원가입 화면만 표시
          <>
            <Stack.Screen
              name="login"
              options={{
                presentation: "modal", // iOS 모달 스타일
              }}
            />
            <Stack.Screen
              name="register"
              options={{
                presentation: "modal",
              }}
            />
          </>
        )}
      </Stack>

      {/**
       * Toast Provider
       * 
       * - 전역에서 Toast 메시지를 쉽게 표시할 수 있도록 구성.
       * - Toast.show({ type: "success", text1: "메시지" }) 형태로 사용 가능.
       * - position: "top" → 화면 상단에 표시
       * - topOffset: iOS 노치 영역을 피하기 위한 여백
       * - visibilityTime: 자동 닫힘 시간 (ms)
       */}
      <Toast position="top" topOffset={60} visibilityTime={2000} />
    </GestureHandlerRootView>
  );
}

/**
 * 스타일 정의
 */
const styles = StyleSheet.create({
  splash: {
    flex: 1, // 화면 전체 채우기
    justifyContent: "center", // 세로 중앙 정렬
    alignItems: "center", // 가로 중앙 정렬
    backgroundColor: "#f5f5f7", // 밝은 iOS 톤 배경
  },
});
