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
    // 게시글 제목 상태 관리
    const [title, setTitle] = useState("");

    // 게시글 내용 상태 관리
    const [content, setContent] = useState("");

    // 선택한 이미지의 URI 상태 관리
    const [imageUri, setImageUri] = useState<string | null>(null);

    // 게시글 등록 중인지 여부 상태 관리 (로딩 표시용)
    const [submitting, setSubmitting] = useState(false);

    // Expo Router의 네비게이션 훅
    const router = useRouter();

    /**
     * 갤러리에서 이미지를 선택하는 함수
     * 1. 갤러리 접근 권한 요청
     * 2. 이미지 선택 UI 표시
     * 3. 선택된 이미지 URI를 상태에 저장
     */
    const pickImage = async () => {
        // 갤러리 접근 권한 요청
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        // 권한이 거부된 경우 알림 표시 후 종료
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }

        // 이미지 선택 UI 실행
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // 이미지만 선택 가능
            allowsEditing: true, // 선택 후 편집 가능
            aspect: [4, 3], // 편집 시 4:3 비율 유지
            quality: 0.8, // 이미지 품질 80%
        });

        // 이미지 선택이 취소되지 않고 URI가 존재하면 상태에 저장
        if (!result.canceled && result.assets?.[0]?.uri) {
            setImageUri(result.assets[0].uri);
        }
    };

    /**
     * 선택한 이미지를 제거하는 함수
     * 확인 알림을 표시하고 사용자가 삭제를 선택하면 이미지 URI를 null로 설정
     */
    const removeImage = () => {
        Alert.alert("이미지 삭제", "선택한 이미지를 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: () => setImageUri(null)
            },
        ]);
    };

    /**
     * 게시글을 Firebase에 등록하는 함수
     * 1. 사용자 인증 확인
     * 2. 입력 값 유효성 검사
     * 3. 이미지가 있으면 Firebase Storage에 업로드
     * 4. Firestore에 게시글 데이터 저장
     * 5. 성공 시 홈 화면으로 이동
     */
    const handleSubmit = async () => {
        // 현재 로그인한 사용자 정보 가져오기
        const user = auth.currentUser;

        // 로그인되지 않은 경우 알림 표시 후 종료
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이용해주세요.");
            return;
        }

        // 제목과 내용이 모두 입력되었는지 검사
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력하세요.");
            return;
        }

        // 등록 시작 - 로딩 상태로 변경
        setSubmitting(true);

        try {
            // 업로드할 이미지 URL을 저장할 변수
            let imageUrl: string | null = null;

            // 이미지가 선택되어 있는 경우 Firebase Storage에 업로드
            if (imageUri) {
                // iOS의 ph:// URI를 처리하기 위해 이미지 조작
                // 압축 및 JPEG 포맷으로 변환
                const manipulated = await ImageManipulator.manipulateAsync(
                    imageUri,
                    [], // 추가 조작 없음
                    {
                        compress: 0.8, // 80% 압축
                        format: ImageManipulator.SaveFormat.JPEG, // JPEG 포맷
                    }
                );

                // 조작된 이미지를 Blob으로 변환
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();

                // Firebase Storage에 저장할 경로 생성
                // 경로 형식: posts/사용자ID/타임스탬프.jpg
                const filePath = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, filePath);

                // Blob을 Firebase Storage에 업로드
                await uploadBytes(storageRef, blob);

                // 업로드된 이미지의 다운로드 URL 가져오기
                imageUrl = await getDownloadURL(storageRef);
            }

            // Firestore의 posts 컬렉션에 새 게시글 문서 추가
            await addDoc(collection(db, "posts"), {
                title: title.trim(), // 제목 (앞뒤 공백 제거)
                content: content.trim(), // 내용 (앞뒤 공백 제거)
                imageUrl, // 이미지 URL (없으면 null)
                userId: user.uid, // 작성자 사용자 ID
                createdAt: serverTimestamp(), // 서버 타임스탬프
            });

            // 게시글 등록 성공 후 상태 초기화
            // 화면 이동 전에 모든 상태를 초기화하여 다음 사용을 위해 준비
            setTitle("");
            setContent("");
            setImageUri(null);
            setSubmitting(false);

            // 홈 화면으로 이동 (현재 화면을 스택에서 제거하고 홈으로 교체)
            // replace를 사용하면 뒤로가기 시 이 화면으로 돌아오지 않음
            router.replace("/(tabs)");

        } catch (e: any) {
            // 오류 발생 시 콘솔에 에러 로그 출력
            console.error("등록 오류:", e);

            // 로딩 상태 해제
            setSubmitting(false);

            // 사용자에게 에러 알림 표시
            Alert.alert("등록 실패", e?.message || "오류가 발생했습니다.");
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* 제목 입력 섹션 */}
                <Text style={styles.label}>제목</Text>
                <TextInput
                    style={styles.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* 내용 입력 섹션 */}
                <Text style={styles.label}>내용</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="내용을 입력하세요"
                    multiline
                    value={content}
                    onChangeText={setContent}
                />

                {/* 이미지 선택/미리보기 섹션 */}
                <View style={{ marginTop: 20 }}>
                    {imageUri ? (
                        // 이미지가 선택된 경우: 미리보기와 삭제 버튼 표시
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
                        // 이미지가 선택되지 않은 경우: 이미지 선택 버튼 표시
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={pickImage}
                        >
                            <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 등록 및 취소 버튼 섹션 */}
                <View style={styles.submitRow}>
                    {/* 등록 버튼 */}
                    <TouchableOpacity
                        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={submitting} // 등록 중에는 버튼 비활성화
                    >
                        {submitting ? (
                            // 등록 중일 때 로딩 스피너 표시
                            <ActivityIndicator color="#fff" />
                        ) : (
                            // 일반 상태일 때 "등록" 텍스트 표시
                            <Text style={styles.primaryButtonText}>등록</Text>
                        )}
                    </TouchableOpacity>

                    {/* 취소 버튼 */}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()} // 이전 화면으로 돌아가기
                        disabled={submitting} // 등록 중에는 버튼 비활성화
                    >
                        <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// 스타일 정의
const styles = StyleSheet.create({
    // 전체 안전 영역 스타일
    safeArea: {
        flex: 1,
        backgroundColor: "#f5f5f7"
    },

    // 스크롤 가능한 컨텐츠 영역 스타일
    container: {
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 80 : 100 // iOS와 Android에 따라 하단 여백 조정
    },

    // 입력 필드 레이블 스타일
    label: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 16,
        color: "#1c1c1e",
    },

    // 입력 필드 공통 스타일
    input: {
        borderWidth: 1,
        borderColor: "#e5e5ea",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#fff",
        fontSize: 16,
    },

    // 여러 줄 입력 필드 추가 스타일
    multiline: {
        minHeight: 120,
        textAlignVertical: "top" // Android에서 텍스트를 상단에 정렬
    },

    // 이미지 미리보기 스타일
    preview: {
        width: "100%",
        height: 200,
        borderRadius: 12,
        marginTop: 12,
        backgroundColor: "#f0f0f0",
    },

    // 보조 버튼 스타일 (이미지 선택 버튼)
    secondaryButton: {
        backgroundColor: "#e5e5ea",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },

    // 보조 버튼 텍스트 스타일
    secondaryButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "500"
    },

    // 이미지 삭제 버튼 스타일
    deleteImageButton: {
        marginTop: 10,
        alignSelf: "center"
    },

    // 이미지 삭제 버튼 텍스트 스타일
    deleteImageText: {
        color: "#FF3B30",
        fontWeight: "600"
    },

    // 등록/취소 버튼 영역 스타일
    submitRow: {
        marginTop: 30,
        gap: 10
    },

    // 주요 버튼 스타일 (등록 버튼)
    primaryButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },

    // 주요 버튼 텍스트 스타일
    primaryButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600"
    },

    // 취소 버튼 스타일
    cancelButton: {
        backgroundColor: "#e5e5ea",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },

    // 취소 버튼 텍스트 스타일
    cancelButtonText: {
        color: "#000",
        fontSize: 16,
        fontWeight: "500"
    },
});