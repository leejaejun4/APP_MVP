import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message"; // ✅ 토스트 추가

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    // 로그인 처리
    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);

            // ✅ 로그인 성공 Toast
            Toast.show({
                type: "success",
                text1: "로그인 성공",
                text2: "환영합니다 👋",
            });

            router.replace("/(tabs)");
        } catch (error: any) {
            // ✅ 에러 코드별 메시지
            let message = "알 수 없는 오류가 발생했습니다.";
            if (error.code === "auth/invalid-credential") {
                message = "이메일 또는 비밀번호가 잘못되었습니다.";
            } else if (error.code === "auth/user-not-found") {
                message = "가입되지 않은 이메일입니다.";
            } else if (error.code === "auth/wrong-password") {
                message = "비밀번호가 틀렸습니다.";
            } else if (error.code === "auth/too-many-requests") {
                message = "잠시 후 다시 시도해주세요.";
            }

            Toast.show({
                type: "error",
                text1: "로그인 실패",
                text2: message,
            });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>로그인</Text>

            <TextInput
                style={styles.input}
                placeholder="이메일"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="비밀번호"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <Button title="로그인" onPress={handleLogin} />

            <Button
                title="회원가입"
                onPress={() => router.push("/register")}
                color="gray"
            />
        </View>
    );
}

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
