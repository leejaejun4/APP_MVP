// app/(tabs)/post/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, TextInput, Button, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import { auth } from "../../../firebase";     // post/[id].tsx는 경로가 더 깊으므로 ../../../ 경로 사용
import { db } from "../../../firebase";

/**
 * 댓글 데이터 타입 정의
 */
interface Comment {
    id: string;
    content: string;
    userId: string;
    createdAt?: any; // 서버 타임스탬프는 Timestamp 타입이므로 any로 단순화
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

export default function PostDetailScreen() {
    // URL 경로의 [id] 파라미터를 읽어옴
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    // 게시글, 댓글, 로딩 상태
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // 댓글 입력 상태
    const [commentText, setCommentText] = useState<string>("");

    /**
     * 게시글 문서 경로와 댓글 서브컬렉션 경로를 메모이즈
     * - id가 없을 수 있는 초기 렌더를 고려
     */
    const postRef = useMemo(() => (id ? doc(db, "posts", String(id)) : null), [id]);
    const commentsRef = useMemo(
        () => (id ? collection(db, "posts", String(id), "comments") : null),
        [id]
    );

    /**
     * 게시글 실시간 구독
     * - onSnapshot으로 변경 사항을 즉시 반영
     * - 존재하지 않거나 오류 시 알림 후 이전 화면으로 이동
     */
    useEffect(() => {
        if (!postRef) return;

        // 게시글 구독 시작
        const stop = onSnapshot(
            postRef,
            (snap) => {
                if (!snap.exists()) {
                    Alert.alert("오류", "게시글을 찾을 수 없습니다.", [
                        { text: "확인", onPress: () => router.back() },
                    ]);
                    return;
                }
                const data = snap.data();
                setPost({
                    id: snap.id,
                    title: data.title,
                    content: data.content,
                    imageUrl: data.imageUrl ?? null,
                    userId: data.userId,
                    createdAt: data.createdAt,
                });
                setLoading(false);
            },
            (err) => {
                console.error(err);
                Alert.alert("오류", "게시글을 불러오는 중 문제가 발생했습니다.");
                setLoading(false);
            }
        );

        // 언마운트 시 구독 해제
        return () => stop();
    }, [postRef, router]);

    /**
     * 댓글 실시간 구독
     * - createdAt 순으로 정렬하여 최신순 또는 오래된 순 표시
     * - 아래에서는 오래된 순으로 정렬하여 대화 흐름처럼 보이게 구성
     */
    useEffect(() => {
        if (!commentsRef) return;

        const q = query(commentsRef, orderBy("createdAt", "asc"));

        const stop = onSnapshot(
            q,
            (snap) => {
                const list: Comment[] = snap.docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        content: data.content,
                        userId: data.userId,
                        createdAt: data.createdAt,
                    };
                });
                setComments(list);
            },
            (err) => {
                console.error(err);
                Alert.alert("오류", "댓글을 불러오는 중 문제가 발생했습니다.");
            }
        );

        return () => stop();
    }, [commentsRef]);

    /**
     * 댓글 작성 처리
     * - 로그인 여부 확인
     * - 공백 댓글 방지
     * - serverTimestamp로 작성 시간 기록
     */
    const handleAddComment = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("로그인이 필요합니다.", "로그인 후 다시 시도하세요.");
            return;
        }
        if (!commentsRef) return;

        const text = commentText.trim();
        if (!text) {
            Alert.alert("입력 오류", "댓글 내용을 입력하세요.");
            return;
        }

        try {
            await addDoc(commentsRef, {
                content: text,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });
            // 입력창 초기화
            setCommentText("");
        } catch (err: any) {
            console.error(err);
            Alert.alert("등록 실패", err?.message || "댓글 등록 중 오류가 발생했습니다.");
        }
    };

    /**
     * createdAt을 간단한 문자열로 변환
     * - Firestore serverTimestamp는 최초 저장 직후에는 undefined일 수 있음
     * - Timestamp 객체인 경우 toDate()로 변환하여 문자열 생성
     */
    const formatDate = (ts: any) => {
        if (!ts) return "";
        try {
            // Timestamp 객체인 경우
            if (typeof ts.toDate === "function") {
                const d = ts.toDate();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                    d.getDate()
                ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
                    d.getMinutes()
                ).padStart(2, "0")}`;
            }
            // 문자열 또는 숫자라면 Date로 변환 시도
            const d = new Date(ts);
            if (!isNaN(d.getTime())) {
                return d.toISOString().slice(0, 16).replace("T", " ");
            }
            return "";
        } catch {
            return "";
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={styles.loadingWrap}>
                <Text>게시글이 존재하지 않습니다.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.meta}>
                작성자: {post.userId}  {post.createdAt ? ` | 작성일: ${formatDate(post.createdAt)}` : ""}
            </Text>

            {post.imageUrl ? (
                <Image
                    source={{ uri: post.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
            ) : null}

            <Text style={styles.content}>{post.content}</Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>댓글</Text>

            {comments.length === 0 ? (
                <Text style={styles.empty}>등록된 댓글이 없습니다.</Text>
            ) : (
                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                            <Text style={styles.commentMeta}>
                                {item.userId}  {item.createdAt ? ` | ${formatDate(item.createdAt)}` : ""}
                            </Text>
                            <Text style={styles.commentText}>{item.content}</Text>
                        </View>
                    )}
                    // ScrollView 안에서 FlatList를 사용할 때 스크롤 충돌을 피하기 위해 높이 제한 또는 scrollEnabled 조절이 필요할 수 있음
                    scrollEnabled={false}
                />
            )}

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
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: 16, backgroundColor: "#fff" },
    title: { fontSize: 22, fontWeight: "700" },
    meta: { color: "#666", marginTop: 6, marginBottom: 12 },
    image: { width: "100%", height: 220, borderRadius: 8, backgroundColor: "#f2f2f2" },
    content: { fontSize: 16, lineHeight: 22, marginTop: 8 },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 20,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
    empty: { color: "#888", marginBottom: 12 },
    commentItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    commentMeta: { color: "#666", marginBottom: 6 },
    commentText: { fontSize: 15, lineHeight: 21 },
    commentInputWrap: {
        marginTop: 12,
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
        paddingVertical: 10,
        backgroundColor: "#fff",
        marginRight: 8,
    },
});
