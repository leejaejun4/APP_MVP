import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";

export default function RootLayout() {
  // user: 현재 로그인된 사용자 객체 (없으면 null)
  const [user, setUser] = useState<User | null>(null);

  // Firebase 인증 상태를 불러오는 동안 로딩 상태 표시
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase에서 로그인 상태 변화를 감지하는 함수
    // 로그인/로그아웃이 발생하면 콜백이 실행됨
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);        // 로그인 상태라면 user에 User 객체 저장, 아니면 null
      setLoading(false); // 로딩 끝났으니 false로 변경
    });

    // 언마운트 시 구독 해제 (메모리 누수 방지)
    return unsubscribe;
  }, []);

  // Firebase 인증 체크 중일 때는 아무것도 보여주지 않음
  // 필요하다면 로딩 스피너나 스플래시 화면을 넣을 수 있음
  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // 로그인 상태라면 (tabs) 그룹 화면만 보여줌
        <Stack.Screen name="(tabs)" />
      ) : (
        // 로그인하지 않았다면 login 화면과 register 화면을 추가 등록
        <>
          {/* expo-router에서는 Fragment를 쓰면 경고가 나므로 조건문을 풀어서 작성 */}
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </>
      )}
    </Stack>
  );
}
