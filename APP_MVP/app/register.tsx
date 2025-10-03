import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
    // 이메일과 비밀번호 입력값 상태 관리
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 화면 전환을 위한 router 객체
    const router = useRouter();

    /**
     * 회원가입 처리 함수
     * Firebase Auth의 createUserWithEmailAndPassword 사용
     */
    const handleRegister = async () => {
        try {
            // Firebase 인증 요청
            await createUserWithEmailAndPassword(auth, email, password);

            alert("회원가입 성공!");

            // 회원가입 성공 시 메인 탭으로 이동
            router.replace("/(tabs)");
        } catch (error: any) {
            // 실패 시 경고창 표시
            alert("회원가입 실패: " + error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>회원가입</Text>

            {/* 이메일 입력 */}
            <TextInput
                style={styles.input}
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            {/* 비밀번호 입력 */}
            <TextInput
                style={styles.input}
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {/* 회원가입 버튼 */}
            <Button title="회원가입" onPress={handleRegister} />

            {/* 로그인 화면으로 돌아가기 */}
            <Button
                title="로그인으로 돌아가기"
                onPress={() => router.back()}
                color="gray"
            />
        </View>
    );
}

// 간단한 스타일 정의
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
});
