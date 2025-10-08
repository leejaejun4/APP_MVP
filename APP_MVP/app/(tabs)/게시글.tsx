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
import * as ImagePicker from "expo-image-picker"; // 갤러리 접근용
import * as ImageManipulator from "expo-image-manipulator"; // 이미지 압축/변환용
import { useRouter } from "expo-router"; // 페이지 이동 (Expo Router)
import { addDoc, collection, serverTimestamp } from "firebase/firestore"; // Firestore 관련
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Storage 관련
import { auth, db, storage } from "../../firebase"; // Firebase 설정 불러오기

/**
 * 게시글 작성 화면 컴포넌트
 * - 제목 / 내용 / 이미지 선택 후 Firestore에 게시글을 등록
 * - 이미지가 포함된 경우 Firebase Storage에 업로드 후 다운로드 URL을 저장
 */
export default function NewPostScreen() {
    // 입력 필드 상태 관리
    const [title, setTitle] = useState(""); // 게시글 제목
    const [content, setContent] = useState(""); // 게시글 내용
    const [imageUri, setImageUri] = useState<string | null>(null); // 선택한 이미지 경로
    const [submitting, setSubmitting] = useState(false); // 업로드 진행 상태
    const router = useRouter(); // 페이지 이동용 객체

    /**
     * 갤러리에서 이미지 선택
     */
    const pickImage = async () => {
        // 갤러리 접근 권한 요청
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }

        // 이미지 선택 창 실행
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // 이미지 타입만 허용
            allowsEditing: true, // 선택 시 편집 허용
            aspect: [4, 3], // 이미지 비율
            quality: 0.8, // 압축 품질
        });

        // 사용자가 이미지를 선택한 경우 (취소하지 않았을 때)
        if (!result.canceled && result.assets?.[0]?.uri) {
            setImageUri(result.assets[0].uri); // 이미지 경로 상태에 저장
        }
    };

    /**
     * 선택한 이미지 삭제
     */
    const removeImage = () => {
        Alert.alert("이미지 삭제", "선택한 이미지를 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => setImageUri(null) },
        ]);
    };

    /**
     * 게시글 등록 처리
     */
    const handleSubmit = async () => {
        const user = auth.currentUser; // 현재 로그인한 사용자 정보 가져오기

        // 로그인 여부 확인
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이용해주세요.");
            return;
        }

        // 제목/내용 입력 검증
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 오류", "제목과 내용을 모두 입력하세요.");
            return;
        }

        setSubmitting(true); // 업로드 시작 표시

        try {
            let imageUrl: string | null = null; // 이미지 다운로드 URL (없을 수 있음)

            // 이미지가 선택된 경우에만 업로드 수행
            if (imageUri) {
                // 1. 이미지 압축 (용량 줄이기)
                const manipulated = await ImageManipulator.manipulateAsync(imageUri, [], {
                    compress: 0.8, // 압축율 (1.0 = 원본 품질)
                    format: ImageManipulator.SaveFormat.JPEG, // JPEG 형식으로 저장
                });

                // 2. Blob 변환
                // React Native에서는 FileReader가 없기 때문에 fetch를 사용해야 함
                const response = await fetch(manipulated.uri);
                const blob = await response.blob();

                // 3. Firebase Storage에 업로드할 파일 경로 지정
                // posts/사용자ID/현재시간.jpg
                const filePath = `posts/${user.uid}/${Date.now()}.jpg`;
                const storageRef = ref(storage, filePath);

                // 4. Blob 데이터를 Firebase Storage에 업로드
                await uploadBytes(storageRef, blob);

                // 5. 업로드 완료 후 다운로드 가능한 https URL 가져오기
                imageUrl = await getDownloadURL(storageRef);
            }

            // 6. Firestore에 게시글 데이터 추가
            // Firestore는 NoSQL 형태로 문서를 저장
            await addDoc(collection(db, "posts"), {
                title: title.trim(), // 제목
                content: content.trim(), // 내용
                imageUrl, // 이미지 다운로드 링크 (없으면 null)
                userId: user.uid, // 작성자 ID
                createdAt: serverTimestamp(), // 서버 시간 기준 등록 시각
            });

            setSubmitting(false); // 업로드 완료

            // 7. 완료 알림 및 홈 화면으로 이동
            Alert.alert("등록 완료", "게시글이 등록되었습니다.", [
                { text: "확인", onPress: () => router.replace("/") },
            ]);
        } catch (e: any) {
            console.error("등록 오류:", e);
            setSubmitting(false);
            Alert.alert("등록 실패", e.message || "오류가 발생했습니다.");
        }
    };

    /**
     * 렌더링 부분
     */
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* 제목 입력란 */}
                <Text style={styles.label}>제목</Text>
                <TextInput
                    style={styles.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChangeText={setTitle}
                />

                {/* 내용 입력란 */}
                <Text style={styles.label}>내용</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    placeholder="내용을 입력하세요"
                    multiline
                    value={content}
                    onChangeText={setContent}
                />

                {/* 이미지 미리보기 또는 선택 버튼 */}
                <View style={{ marginTop: 20 }}>
                    {imageUri ? (
                        <View>
                            {/* 선택된 이미지 미리보기 */}
                            <Image source={{ uri: imageUri }} style={styles.preview} />

                            {/* 이미지 삭제 버튼 */}
                            <TouchableOpacity onPress={removeImage} style={styles.deleteImageButton}>
                                <Text style={styles.deleteImageText}>이미지 삭제</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // 이미지가 없을 때 선택 버튼 표시
                        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
                            <Text style={styles.secondaryButtonText}>이미지 선택</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 등록 / 취소 버튼 */}
                <View style={styles.submitRow}>
                    {/* 등록 버튼 */}
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

                    {/* 취소 버튼 */}
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

/**
 * iOS 친화적인 밝은 톤의 UI 스타일 정의
 */
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
    container: { padding: 20, paddingBottom: Platform.OS === "ios" ? 80 : 100 },
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
    multiline: { minHeight: 120, textAlignVertical: "top" },
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
    secondaryButtonText: { color: "#000", fontSize: 16, fontWeight: "500" },
    deleteImageButton: { marginTop: 10, alignSelf: "center" },
    deleteImageText: { color: "#FF3B30", fontWeight: "600" },
    submitRow: { marginTop: 30, gap: 10 },
    primaryButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
    cancelButton: {
        backgroundColor: "#e5e5ea",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButtonText: { color: "#000", fontSize: 16, fontWeight: "500" },
});
