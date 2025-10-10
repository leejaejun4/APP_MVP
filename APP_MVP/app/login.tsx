import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * LoginScreen (iOS 스타일)
 * - Firebase Auth 로그인 처리
 * - Toast 알림 + iOS 톤 UI
 */
export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const insets = useSafeAreaInsets();

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
        <SafeAreaView
            style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
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
                    <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                        <Text style={styles.primaryButtonText}>로그인</Text>
                    </TouchableOpacity>

                    {/* 회원가입 버튼 */}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push("/register")}
                    >
                        <Text style={styles.secondaryButtonText}>회원가입</Text>
                    </TouchableOpacity>

                    {/* 로그인 없이 홈으로 이동 */}
                    <TouchableOpacity
                        style={[styles.linkButton, { marginTop: 20 }]}
                        onPress={() => router.replace("/(tabs)")}
                    >
                        <Text style={styles.linkText}>홈으로 이동</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f9f9fb",
    },
    container: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111",
        textAlign: "center",
        marginBottom: 40,
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e5ea",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    primaryButton: {
        backgroundColor: "#007aff",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 6,
        shadowColor: "#007aff",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
    secondaryButton: {
        backgroundColor: "#f2f2f4",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 10,
    },
    secondaryButtonText: {
        color: "#333",
        fontSize: 16,
        fontWeight: "500",
    },
    linkButton: {
        alignItems: "center",
    },
    linkText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#007aff",
    },
});
