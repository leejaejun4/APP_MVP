import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    Image,
    TextInput,
    Button,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    SafeAreaView,
    Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    doc,
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

/**
 * 댓글 데이터 타입 정의
 */
interface Comment {
    id: string;
    content: string;
    userId: string;
    createdAt?: any;
}

/**
 * 게시글 데이터 타입 정의
 */
interface Post {
    id: string;
    title: string;
    content: string;
    imageUrl?: string | null;
    userId: string;
    createdAt?: any;
}

/**
 * 게시글 상세 페이지
 * - Firestore에서 실시간으로 게시글 및 댓글 데이터를 불러와 표시
 * - 댓글 등록 및 삭제 가능
 */
export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>(); // URL 파라미터로 게시글 ID 가져오기
    const router = useRouter();

    const [post, setPost] = useState<Post | null>(null); // 게시글 데이터
    const [comments, setComments] = useState<Comment[]>([]); // 댓글 리스트
    const [loading, setLoading] = useState(true); // 로딩 상태
    const [commentText, setCommentText] = useState(""); // 입력 중인 댓글 텍스트

    const user = auth.currentUser;

    // Firestore 문서 참조
    const postRef = useMemo(() => (id ? doc(db, "posts", String(id)) : null), [id]);
    const commentsRef = useMemo(
        () => (id ? collection(db, "posts", String(id), "comments") : null),
        [id]
    );

    /**
     * 게시글 실시간 구독
     */
    useEffect(() => {
        if (!postRef) return;
        const stop = onSnapshot(postRef, (snap) => {
            if (!snap.exists()) {
                Alert.alert("오류", "게시글을 찾을 수 없습니다.", [
                    { text: "확인", onPress: () => router.back() },
                ]);
                return;
            }
            setPost({ id: snap.id, ...snap.data() } as Post);
            setLoading(false);
        });
        return stop;
    }, [postRef]);

    /**
     * 댓글 실시간 구독
     */
    useEffect(() => {
        if (!commentsRef) return;
        const q = query(commentsRef, orderBy("createdAt", "asc"));
        const stop = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
            setComments(list);
        });
        return stop;
    }, [commentsRef]);

    /**
     * 댓글 등록 처리
     */
    const handleAddComment = async () => {
        if (!user) return Alert.alert("로그인이 필요합니다.");
        const text = commentText.trim();
        if (!text) return Alert.alert("입력 오류", "댓글을 입력하세요.");

        await addDoc(commentsRef!, {
            content: text,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
        setCommentText("");
    };

    /**
     * 댓글 삭제 처리
     */
    const handleDeleteComment = (commentId: string) => {
        Alert.alert("삭제 확인", "댓글을 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: async () => await deleteDoc(doc(db, "posts", id!, "comments", commentId)),
            },
        ]);
    };

    // 로딩 중 표시
    if (loading)
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator />
            </View>
        );

    /**
     * 실제 렌더링 부분
     */
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* 게시글 제목 */}
                    <Text style={styles.title}>{post?.title}</Text>
                    <Text style={styles.meta}>작성자: {post?.userId}</Text>

                    {/* 게시글 이미지 (있을 경우만 표시) */}
                    {post?.imageUrl && (
                        <Image
                            source={{ uri: post.imageUrl }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    )}

                    {/* 게시글 내용 */}
                    <Text style={styles.content}>{post?.content}</Text>

                    <View style={styles.divider} />

                    {/* 댓글 섹션 */}
                    <Text style={styles.sectionTitle}>댓글</Text>

                    {/* 댓글 없을 때 */}
                    {comments.length === 0 ? (
                        <Text style={styles.empty}>등록된 댓글이 없습니다.</Text>
                    ) : (
                        <FlatList
                            data={comments}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <View style={styles.commentHeader}>
                                        <Text style={styles.commentMeta}>{item.userId}</Text>
                                        {user?.uid === item.userId && (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteComment(item.id)}
                                            >
                                                <Text style={styles.commentDelete}>삭제</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.commentText}>{item.content}</Text>
                                </View>
                            )}
                            scrollEnabled={false} // 스크롤뷰 내부이므로 스크롤 비활성화
                        />
                    )}

                    {/* 댓글 입력창 */}
                    <View style={styles.commentInputWrap}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="댓글을 입력하세요"
                            value={commentText}
                            onChangeText={setCommentText}
                        />
                        <Button title="등록" onPress={handleAddComment} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/**
 * 스타일 정의
 */
const styles = StyleSheet.create({
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: {
        padding: 16,
        backgroundColor: "#fff",
        paddingBottom: 120, // 하단 탭바 및 키보드 여유 공간 확보
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 4,
    },
    meta: {
        color: "#666",
        marginBottom: 12,
    },
    image: {
        width: "100%",
        height: 300, // 기존보다 높이 증가 (짤림 방지)
        borderRadius: 12,
        backgroundColor: "#f0f0f0",
        marginBottom: 12,
    },
    content: {
        fontSize: 16,
        lineHeight: 22,
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    empty: {
        color: "#888",
        marginBottom: 12,
    },
    commentItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f2f2f2",
    },
    commentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    commentMeta: {
        color: "#666",
        fontSize: 13,
    },
    commentText: {
        fontSize: 15,
        lineHeight: 21,
    },
    commentDelete: {
        color: "#FF3B30",
        fontWeight: "600",
    },
    commentInputWrap: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    commentInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 8,
        backgroundColor: "#fff",
    },
});
