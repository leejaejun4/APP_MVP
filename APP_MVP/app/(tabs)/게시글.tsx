/**
 * NewPostScreen
 * - 게시글 작성 + 이미지 업로드 화면
 * - Expo Router, Firebase(Auth/Firestore/Storage), Expo ImagePicker/ImageManipulator 사용
 *
 * 전제 조건
 * 1) firebase 초기화 파일(firebase.ts 혹은 firebase.js)에서 auth, db, storage export 완료
 * 2) 앱 권한 처리: 미디어 라이브러리 접근 권한 필요(iOS/Android)
 * 3) Firestore 보안 규칙: 인증 사용자 쓰기 허용 여부 확인
 */

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
    // 제목, 내용, 선택 이미지, 업로드 진행 상태
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    /**
     * 갤러리에서 이미지 1장 선택
     * - 권한 요청
     * - 4:3 비율로 간단 편집 허용
     * - 선택 성공 시 로컬 URI 상태 저장
     */
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
                quality: 0.8, // 원본 대비 압축(0~1), 0.8 권장
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                setImageUri(result.assets[0].uri);
            }
        } catch (err) {
            console.error("이미지 선택 오류:", err);
            Alert.alert("이미지 선택 실패", "이미지를 선택하는 중 문제가 발생했습니다.");
        }
    };

    /**
     * 선택한 이미지 제거 확인
     */
    const removeImage = () => {
        Alert.alert("이미지 삭제", "선택한 이미지를 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => setImageUri(null) },
        ]);
    };

    /**
     * 게시글 등록
     * 처리 순서:
     * 1) 로그인 사용자 확인
     * 2) 제목/내용 유효성 확인
     * 3) (선택) 이미지 압축 → Blob 변환 → Firebase Storage 업로드 → 다운로드 URL 획득
     * 4) Firestore posts 컬렉션에 문서 생성
     * 5) 입력값 초기화 후 탭 루트로 이동
     */
    const handleSubmit = async () => {
        const user = auth.currentUser;

        // 비로그인 사용자는 진행 차단
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이용해주세요.");
            return;
        }

        // 제목/내용 필수
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력하세요.");
            return;
        }

        // 중복 제출 차단
        if (submitting) return;
        setSubmitting(true);

        try {
            let imageUrl: string | null = null;

            // 이미지가 있는 경우만 업로드
            if (imageUri) {
                // 1) 클라이언트에서 JPEG로 재인코딩(용량 절감)
                const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [], // 별도 변형 없음(회전/리사이즈가 필요하면 여기에 추가)
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );

                // 2) Blob 변환
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();

                // 3) Storage 경로 생성: posts/{uid}/{timestamp}.jpg
                const filePath = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, filePath);

                // 4) 업로드
                await uploadBytes(storageRef, blob);

                // 5) 다운로드 URL 확보
                imageUrl = await getDownloadURL(storageRef);
            }

            // Firestore에 문서 추가
            await addDoc(collection(db, "posts"), {
                title: title.trim(),
                content: content.trim(),
                imageUrl,
                userId: user.uid,
                createdAt: serverTimestamp(), // 서버 시간 스탬프
            });

            // 폼 초기화
            setTitle("");
            setContent("");
            setImageUri(null);

            /**
             * 라우팅
             * - 탭 루트로 이동
             * - 파일 구조에 따라 "/(tabs)" 또는 "/(tabs)/index" 사용
             * - 여기서는 탭 루트로 리플레이스하여 뒤로가기 스택을 정리
             */
            router.replace("/(tabs)");
        } catch (e: any) {
            console.error("등록 오류:", e);
            Alert.alert("등록 실패", e?.message || "오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* 제목 입력 */}
                <Text style={styles.label}>제목</Text>
                <TextInput
                    style={styles.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChangeText={setTitle}
                    autoCapitalize="none"
                    returnKeyType="next"
                    accessibilityLabel="제목 입력"
                />

                {/* 내용 입력 */}
                <Text style={styles.label}>내용</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="내용을 입력하세요"
                    multiline
                    value={content}
                    onChangeText={setContent}
                    textAlignVertical="top"
                    accessibilityLabel="내용 입력"
                />

                {/* 이미지 선택/미리보기 섹션 */}
                <View style={{ marginTop: 20 }}>
                    {imageUri ? (
                        <View>
                            <Image source={{ uri: imageUri }} style={styles.preview} />
                            <TouchableOpacity
                                onPress={removeImage}
                                style={styles.deleteImageButton}
                                accessibilityRole="button"
                                accessibilityLabel="이미지 삭제"
                            >
                                <Text style={styles.deleteImageText}>이미지 삭제</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={pickImage}
                            accessibilityRole="button"
                            accessibilityLabel="이미지 선택"
                        >
                            <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 제출/취소 버튼 영역 */}
                <View style={styles.submitRow}>
                    <TouchableOpacity
                        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityLabel="게시글 등록"
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
                        accessibilityRole="button"
                        accessibilityLabel="취소"
                    >
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* =========================
   스타일
   - iOS/Android 기본 톤에 맞춘 중립 색상
   - 접근성 고려한 대비
========================= */
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f5f5f7",
    },
    container: {
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 80 : 100, // 소프트키/홈 인디케이터 영역 확보
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
