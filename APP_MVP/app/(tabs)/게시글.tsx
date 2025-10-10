import React, { useState } from "react";
import {
    SafeAreaView,
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

    // 이미지 선택
    const pickImage = async () => {
        console.log("pickImage start");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            console.log("갤러리 권한 거부");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            console.log("이미지 선택됨:", result.assets[0].uri);
            setImageUri(result.assets[0].uri);
        } else {
            console.log("이미지 선택 취소");
        }
    };

    const removeImage = () => {
        Alert.alert("이미지 삭제", "선택한 이미지를 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => setImageUri(null) },
        ]);
    };

    // 게시글 등록
    const handleSubmit = async () => {
        console.log("=== handleSubmit 시작 ===");
        const user = auth.currentUser;

        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이용해주세요.");
            console.log("로그인 안 됨");
            return;
        }

        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력하세요.");
            console.log("입력값 부족");
            return;
        }

        setSubmitting(true);

        try {
            console.log("Firebase 업로드 시작");
            let imageUrl: string | null = null;

            if (imageUri) {
                console.log("이미지 처리 중...");
                const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                console.log("이미지 변환 완료:", manipulated.uri);

                console.log("Blob 변환 중...");
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();
                console.log("Blob 변환 완료");

                const filePath = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, filePath);
                console.log("Storage 경로:", filePath);

                await uploadBytes(storageRef, blob);
                console.log("Storage 업로드 완료");

                imageUrl = await getDownloadURL(storageRef);
                console.log("Storage URL:", imageUrl);
            } else {
                console.log("이미지 없이 등록 진행");
            }

            console.log("Firestore에 문서 추가 중...");
            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                content: content.trim(),
                imageUrl,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });
            console.log("Firestore 문서 추가 완료");

            setTitle("");
            setContent("");
            setImageUri(null);
            setSubmitting(false);

            console.log("라우팅 이동 -> /(tabs)");
            router.replace("/(tabs)");
            console.log("=== handleSubmit 완료 ===");
        } catch (e: any) {
            console.error("등록 오류:", e);
            setSubmitting(false);
            Alert.alert("등록 실패", e?.message || "오류가 발생했습니다.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.label}>제목</Text>
                <TextInput
                    style={styles.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>내용</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="내용을 입력하세요"
                    multiline
                    value={content}
                    onChangeText={setContent}
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
                        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
                            <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.submitRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
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
        backgroundColor: "#f5f5f7",
    },
    container: {
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 80 : 100,
    },
    label: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 16,
        color: "#1c1c1e",
    },
    input: {
        borderWidth: 1,
        borderColor: "#e5e5ea",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#fff",
        fontSize: 16,
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
        backgroundColor: "#f0f0f0",
    },
    secondaryButton: {
        backgroundColor: "#e5e5ea",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "500",
    },
    deleteImageButton: {
        marginTop: 10,
        alignSelf: "center",
    },
    deleteImageText: {
        color: "#FF3B30",
        fontWeight: "600",
    },
    submitRow: {
        marginTop: 30,
        gap: 10,
    },
    primaryButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
    cancelButton: {
        backgroundColor: "#e5e5ea",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "500",
    },
});
