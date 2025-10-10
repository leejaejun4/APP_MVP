import React, { useState } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleRegister = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("회원가입 성공!");
            router.replace("/(tabs)");
        } catch (error: any) {
            alert("회원가입 실패: " + error.message);
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
                    <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
                        <Text style={styles.primaryButtonText}>회원가입</Text>
                    </TouchableOpacity>

                    {/* 로그인으로 돌아가기 */}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.secondaryButtonText}>로그인으로 돌아가기</Text>
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
        marginTop: 10,
        shadowColor: "#007aff",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
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
        marginTop: 12,
    },
    secondaryButtonText: {
        color: "#333",
        fontSize: 16,
        fontWeight: "500",
    },
});
