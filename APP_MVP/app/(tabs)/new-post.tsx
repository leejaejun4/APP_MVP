// app/(tabs)/new-post.tsx
// 새 게시글 작성 화면
// 기능 요약:
// - 제목, 내용 입력
// - 갤러리에서 이미지 선택
// - iOS ph:// 문제 방지를 위해 expo-image-manipulator로 변환
// - Firebase Storage에 이미지 업로드 후 URL 저장
// - Firestore에 게시글 문서 추가

import React, { useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    Button,
    Image,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";            // 갤러리 접근 라이브러리
import * as ImageManipulator from "expo-image-manipulator";  // iOS ph:// → file:// 변환용
import { useRouter } from "expo-router";                     // 화면 이동
import { addDoc, collection, serverTimestamp } from "firebase/firestore"; // Firestore API
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";       // Storage API
import { auth, db, storage } from "../../firebase";          // Firebase 초기화 객체

export default function NewPostScreen() {
    // 입력 상태값
    const [title, setTitle] = useState<string>("");             // 제목
    const [content, setContent] = useState<string>("");         // 내용
    const [imageUri, setImageUri] = useState<string | null>(null); // 선택된 이미지 경로
    const [submitting, setSubmitting] = useState<boolean>(false); // 업로드 진행 여부

    const router = useRouter();

    /**
     * 갤러리에서 이미지 선택
     * - 권한 요청
     * - 선택된 첫 번째 이미지의 로컬 URI를 상태에 저장
     */
    const pickImage = async () => {
        try {
            // 갤러리 권한 요청
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
                return;
            }

            // 갤러리 실행
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images, // 이미지만 선택
                allowsEditing: true,   // 편집 허용
                aspect: [4, 3],        // 비율 고정
                quality: 0.8,          // 압축 품질
            });

            if (result.canceled) return;

            // 첫 번째 선택된 이미지의 URI만 사용
            const asset = result.assets?.[0];
            if (asset?.uri) {
                setImageUri(asset.uri);
            }
        } catch (err: any) {
            console.error("[pickImage] error", err);
            Alert.alert("이미지 선택 오류", err?.message || "이미지 선택 중 오류가 발생했습니다.");
        }
    };

    /**
     * iOS ph:// → file:// 변환
     * expo-image-manipulator를 사용하여 항상 fetch 가능한 file:// URI를 리턴
     */
    const normalizeUriForUpload = async (uri: string) => {
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [], // 변환 없음
                {
                    compress: 0.9,
                    format: ImageManipulator.SaveFormat.JPEG, // JPEG으로 변환
                }
            );
            return manipulated.uri; // 변환된 file:// URI
        } catch (err) {
            console.warn("[normalizeUriForUpload] 변환 실패 → 원본 URI 사용", err);
            return uri; // 실패 시 원본 반환
        }
    };

    /**
     * 게시글 등록 처리
     * 순서:
     * 1. 로그인 여부 확인
     * 2. 제목/내용 입력 검증
     * 3. 이미지 업로드 (Storage)
     * 4. Firestore에 게시글 데이터 추가
     */
    const handleSubmit = async () => {
        // 로그인 여부 확인
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("로그인이 필요합니다.", "로그인 후 다시 시도하세요.");
            return;
        }

        // 입력값 검증
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력해주세요.");
            return;
        }

        setSubmitting(true); // 업로드 시작 표시

        try {
            let imageUrl: string | null = null;

            // 이미지 업로드 과정
            if (imageUri) {
                // 파일명을 posts/{userId}/{timestamp}.jpg 형태로 구성
                const fileName = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, fileName);

                // ph:// 문제 해결용 URI 변환
                const uploadUri = await normalizeUriForUpload(imageUri);

                // fetch로 파일 → blob 변환
                const response = await fetch(uploadUri);
                const blob = await response.blob();

                console.log("[Upload] 경로:", storageRef.fullPath);
                console.log("[Upload] blob size:", (blob as any)?.size ?? "unknown");

                // Storage 업로드
                await uploadBytes(storageRef, blob);

                // 업로드 후 다운로드 URL 가져오기
                imageUrl = await getDownloadURL(storageRef);
                console.log("[Upload] 성공, url:", imageUrl);
            }

            // Firestore에 게시글 추가
            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                content: content.trim(),
                imageUrl: imageUrl,     // 이미지 없으면 null
                userId: user.uid,       // 작성자 ID
                createdAt: serverTimestamp(), // 서버 시간
            });

            // 완료 알림 후 초기화
            Alert.alert("등록 완료", "게시글이 등록되었습니다.", [
                {
                    text: "확인",
                    onPress: () => {
                        setTitle("");
                        setContent("");
                        setImageUri(null);
                        router.replace("/"); // 홈으로 이동
                    },
                },
            ]);
        } catch (err: any) {
            console.error("[Upload Error]", err);
            Alert.alert("등록 실패", err?.message || JSON.stringify(err) || "알 수 없는 오류가 발생했습니다.");
        } finally {
            setSubmitting(false); // 업로드 종료
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* 제목 입력 */}
                <Text style={styles.label}>제목</Text>
                <TextInput
                    style={styles.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* 내용 입력 */}
                <Text style={styles.label}>내용</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="내용을 입력하세요"
                    multiline
                    value={content}
                    onChangeText={setContent}
                />

                {/* 이미지 선택 */}
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

                {/* 등록 버튼 */}
                <View style={styles.submitRow}>
                    <Button
                        title={submitting ? "등록 중..." : "등록"}
                        onPress={handleSubmit}
                        disabled={submitting}
                    />
                    {submitting && <ActivityIndicator style={{ marginLeft: 12 }} />}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// 스타일 정의
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#fff", // iOS 노치 영역도 흰색으로
    },
    container: { padding: 16 },
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
        textAlignVertical: "top", // Android에서 텍스트 위쪽부터 입력되도록
    },
    imageRow: {
        marginTop: 16,
        gap: 12,
    },
    preview: {
        width: "100%",
        height: 200,
        borderRadius: 8,
        marginTop: 8,
    },
    submitRow: {
        marginTop: 24,
        flexDirection: "row",
        alignItems: "center",
    },
});
