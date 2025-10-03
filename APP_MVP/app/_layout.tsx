import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import Toast from "react-native-toast-message"; // ✅ 추가

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return null; // 로딩 화면 대신 Splash 넣어도 됨
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </>
        )}
      </Stack>

      {/* ✅ Toast Provider (전역에서 토스트 가능) */}
      <Toast />
    </>
  );
}
