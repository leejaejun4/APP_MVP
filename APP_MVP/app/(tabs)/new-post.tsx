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

    const pickImage = async () => {
        try {
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

            if (result.canceled) return;

            const asset = result.assets?.[0];
            if (asset?.uri) setImageUri(asset.uri);
        } catch (err: any) {
            Alert.alert("이미지 선택 오류", err?.message || "이미지 선택 중 오류");
        }
    };

    const normalizeUriForUpload = async (uri: string) => {
        try {
            const manipulated = await ImageManipulator.manipulateAsync(uri, [], {
                compress: 0.9,
                format: ImageManipulator.SaveFormat.JPEG,
            });
            return manipulated.uri;
        } catch {
            return uri;
        }
    };

    const handleSubmit = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 다시 시도하세요.");
            return;
        }
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력해주세요.");
            return;
        }

        setSubmitting(true);

        try {
            let imageUrl: string | null = null;
            if (imageUri) {
                const fileName = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, fileName);
                const uploadUri = await normalizeUriForUpload(imageUri);
                const response = await fetch(uploadUri);
                const blob = await response.blob();

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

            Alert.alert("등록 완료", "게시글이 등록되었습니다.", [
                {
                    text: "확인",
                    onPress: () => {
                        setTitle("");
                        setContent("");
                        setImageUri(null);
                        router.replace("/");
                    },
                },
            ]);
        } catch (err: any) {
            Alert.alert("등록 실패", err?.message || "알 수 없는 오류");
        } finally {
            setSubmitting(false);
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
                    <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
                        <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                    </TouchableOpacity>
                    {imageUri && (
                        <Image source={{ uri: imageUri }} style={styles.preview} />
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
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f5f5f7", // iOS 기본 배경
    },
    container: {
        padding: 20,
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
    submitRow: {
        marginTop: 30,
    },
    primaryButton: {
        backgroundColor: "#007AFF", // iOS system blue
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
});
