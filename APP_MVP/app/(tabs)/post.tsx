import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebase";

export default function NewPostScreen() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            setImageUri(result.assets[0].uri);
        }
    };

    const removeImage = () => {
        Alert.alert("이미지 삭제", "선택한 이미지를 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => setImageUri(null) },
        ]);
    };

    const handleSubmit = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이용해주세요.");
            return;
        }
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력하세요.");
            return;
        }
        if (submitting) return;
        setSubmitting(true);

        try {
            let imageUrl: string | null = null;
            if (imageUri) {
                const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                const blob = await (await fetch(manipulated.uri)).blob();
                const filePath = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                content: content.trim(),
                imageUrl,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });

            setTitle("");
            setContent("");
            setImageUri(null);
            router.replace("/(tabs)");
        } catch (e: any) {
            console.error("등록 오류:", e);
            Alert.alert("등록 실패", e?.message || "오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView
            style={[
                styles.safeArea,
                { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
            ]}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.header}>새 게시글 작성</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>제목</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="제목을 입력하세요"
                        value={title}
                        onChangeText={setTitle}
                        returnKeyType="next"
                    />

                    <Text style={styles.label}>내용</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        placeholder="내용을 입력하세요"
                        value={content}
                        onChangeText={setContent}
                        multiline
                    />

                    <View style={{ marginTop: 20 }}>
                        {imageUri ? (
                            <View>
                                <Image source={{ uri: imageUri }} style={styles.preview} />
                                <TouchableOpacity
                                    onPress={removeImage}
                                    style={styles.deleteImageButton}
                                >
                                    <Text style={styles.deleteImageText}>이미지 삭제</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={pickImage}
                            >
                                <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.submitRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>등록</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={submitting}
                    >
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f9f9fb",
    },
    container: {
        paddingHorizontal: 20,
    },
    header: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111",
        marginVertical: 18,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    label: {
        fontSize: 15,
        fontWeight: "600",
        color: "#222",
        marginTop: 10,
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#f8f8fa",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#e0e0e5",
    },
    multiline: {
        minHeight: 120,
        textAlignVertical: "top",
    },
    preview: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        marginTop: 12,
        backgroundColor: "#f0f0f2",
    },
    secondaryButton: {
        marginTop: 8,
        backgroundColor: "#f1f1f3",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    secondaryButtonText: {
        fontSize: 16,
        color: "#007aff",
        fontWeight: "600",
    },
    deleteImageButton: {
        marginTop: 10,
        alignSelf: "center",
    },
    deleteImageText: {
        color: "#ff3b30",
        fontWeight: "600",
    },
    submitRow: {
        marginTop: 30,
        gap: 10,
    },
    primaryButton: {
        backgroundColor: "#007aff",
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#007aff",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 4,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },
    cancelButton: {
        backgroundColor: "#f2f2f4",
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#333",
        fontSize: 16,
        fontWeight: "500",
    },
});
