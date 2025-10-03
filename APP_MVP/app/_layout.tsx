import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import Toast from "react-native-toast-message";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";

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
    return (
      <View style={styles.splash}>
        {/* 로고 + 로딩 인디케이터 */}
        <Image
          source={require("../assets/images/react-logo.png")}
          style={{ width: 80, height: 80, marginBottom: 20 }}
        />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="(tabs)" />
        ) : (
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

      {/* ✅ Toast Provider */}
      <Toast
        position="top"
        topOffset={60} // iOS 노치 밑으로
        visibilityTime={2000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f7", // iOS 톤 배경
  },
});
