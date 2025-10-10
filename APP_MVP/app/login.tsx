import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

/**
 * LoginScreen
 * - Firebase Auth 이메일/비밀번호 로그인 처리
 * - 로그인 성공 시 홈 탭(/(tabs))으로 이동
 * - 로그인 없이 홈으로 이동하는 옵션 추가
 */
export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    /**
     * 로그인 처리
     */
    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);

            Toast.show({
                type: "success",
                text1: "로그인 성공",
                text2: "환영합니다 👋",
            });

            router.replace("/(tabs)");
        } catch (error: any) {
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

            {/* 로그인 버튼 */}
            <Button title="로그인" onPress={handleLogin} />

            {/* 회원가입 이동 */}
            <Button
                title="회원가입"
                onPress={() => router.push("/register")}
                color="gray"
            />

            {/* 로그인 없이 홈으로 이동 */}
            <View style={{ marginTop: 20 }}>
                <Button
                    title="홈으로 이동"
                    onPress={() => router.replace("/(tabs)")}
                    color="#007AFF"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
});
