// app/(tabs)/new-post.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, Image, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import {
    ref,
    uploadBytes,
    getDownloadURL,
} from "firebase/storage";
import { auth } from "../../firebase";        // 루트에 firebase.js가 있다고 가정 (app/(tabs) 기준으로 ../../)
import { db, storage } from "../../firebase";

/**
 * 글 작성 화면
 * - 제목, 내용 입력
 * - 갤러리에서 이미지 선택
 * - Storage에 이미지 업로드 후, 해당 URL을 포함한 문서를 Firestore에 생성
 */
export default function NewPostScreen() {
    // 입력 폼 상태
    const [title, setTitle] = useState<string>("");
    const [content, setContent] = useState<string>("");
    // 선택된 이미지의 로컬 URI (갤러리 선택 결과)
    const [imageUri, setImageUri] = useState<string | null>(null);
    // 업로드 진행 시 로딩 표시
    const [submitting, setSubmitting] = useState<boolean>(false);

    const router = useRouter();

    /**
     * 갤러리 권한 요청 후 이미지 한 장 선택
     * - 권한 거부 시 사용자에게 안내
     * - 성공 시 imageUri 상태에 로컬 파일 URI 저장
     */
    const pickImage = async () => {
        // 미디어 라이브러리 권한 요청
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }

        // 갤러리 열기
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // 이미지 파일만 선택
            allowsEditing: true,                             // 간단 편집 허용
            aspect: [4, 3],                                  // 편집 시 비율
            quality: 0.8,                                    // 압축 품질
        });

        // 선택 취소 시 바로 리턴
        if (result.canceled) return;

        // 하나만 선택하도록 설정했으므로 첫 번째 에셋 사용
        const asset = result.assets?.[0];
        if (asset?.uri) {
            setImageUri(asset.uri);
        }
    };

    /**
     * 글 생성 처리
     * 1) 유효성 검사
     * 2) 이미지가 있으면 Storage에 업로드 후 다운로드 URL 획득
     * 3) Firestore에 posts 문서 생성
     */
    const handleSubmit = async () => {
        // 로그인 여부 확인
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("로그인이 필요합니다.", "로그인 후 다시 시도하세요.");
            return;
        }

        // 기본 유효성 검사
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력해주세요.");
            return;
        }

        setSubmitting(true);

        try {
            let imageUrl: string | null = null;

            // 이미지가 선택되어 있다면 Storage에 업로드
            if (imageUri) {
                // Storage 경로를 게시글 작성자 UID 기반으로 구성
                // 중복 방지를 위해 타임스탬프를 파일명 일부로 사용
                const fileName = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, fileName);

                // Expo 환경에서는 fetch(uri).blob() 방식으로 Blob 생성 가능
                const response = await fetch(imageUri);
                const blob = await response.blob();

                // Storage에 업로드
                await uploadBytes(storageRef, blob);
                // 업로드 완료 후 다운로드 URL 획득
                imageUrl = await getDownloadURL(storageRef);
            }

            // Firestore에 문서 추가
            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                content: content.trim(),
                imageUrl: imageUrl,             // 이미지가 없으면 null
                userId: user.uid,               // 작성자 식별
                createdAt: serverTimestamp(),   // 서버 타임스탬프
            });

            // 성공 안내 후 목록으로 이동
            Alert.alert("등록 완료", "게시글이 등록되었습니다.", [
                {
                    text: "확인",
                    onPress: () => {
                        // 입력값 초기화 후 홈으로 이동
                        setTitle("");
                        setContent("");
                        setImageUri(null);
                        router.replace("/"); // 탭의 홈(index.tsx)로 이동
                    },
                },
            ]);
        } catch (err: any) {
            console.error(err);
            Alert.alert("등록 실패", err?.message || "알 수 없는 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
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

            <View style={styles.imageRow}>
                <Button title="이미지 선택" onPress={pickImage} />
                {imageUri ? (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.preview}
                        resizeMode="cover"
                    />
                ) : null}
            </View>

            <View style={styles.submitRow}>
                <Button
                    title={submitting ? "등록 중..." : "등록"}
                    onPress={handleSubmit}
                    disabled={submitting}
                />
                {submitting && <ActivityIndicator style={{ marginLeft: 12 }} />}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: "#fff" },
    label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    multiline: {
        minHeight: 120,
        textAlignVertical: "top",
    },
    imageRow: {
        marginTop: 16,
        gap: 12,
    },
    preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 8 },
    submitRow: {
        marginTop: 24,
        flexDirection: "row",
        alignItems: "center",
    },
});
