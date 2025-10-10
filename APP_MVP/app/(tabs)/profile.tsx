import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { auth, db } from "../../firebase";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
} from "firebase/firestore";
import { useRouter } from "expo-router";

/**
 * ProfileScreen
 * 사용자 프로필 화면
 * Firestore에서 작성한 게시글 및 댓글 수 로드
 * 로그인하지 않은 경우 로그인 유도
 * 닉네임 관련 정보 제거
 * 이메일, 가입일, 마지막 로그인, 통계, 최근 게시글 표시
 */
export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [postCount, setPostCount] = useState<number | null>(null);
    const [commentCount, setCommentCount] = useState<number | null>(null);
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * 사용자 관련 데이터 로드
     * 게시글 수, 댓글 수, 최근 작성 게시글
     */
    const loadUserStats = async () => {
        if (!user) return;
        try {
            setLoading(true);

            const postQuery = query(collection(db, "posts"), where("userId", "==", user.uid));
            const postSnapshot = await getDocs(postQuery);
            setPostCount(postSnapshot.size);

            const postIds = postSnapshot.docs.map((d) => d.id);
            let totalComments = 0;
            for (const postId of postIds) {
                const commentsRef = collection(db, "posts", postId, "comments");
                const commentsSnapshot = await getDocs(commentsRef);
                totalComments += commentsSnapshot.size;
            }
            setCommentCount(totalComments);

            const recentQuery = query(
                collection(db, "posts"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc"),
                limit(3)
            );
            const recentSnapshot = await getDocs(recentQuery);
            setRecentPosts(recentSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("프로필 데이터 로드 실패:", e);
            Alert.alert("오류", "데이터를 불러오는 중 문제가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadUserStats();
        } else {
            setLoading(false);
        }
    }, []);

    if (!user) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.noticeText}>로그인 후 이용해주세요.</Text>
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.replace("/login")}
                >
                    <Text style={styles.loginButtonText}>로그인 하러 가기</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>내 프로필</Text>

                <Text style={styles.label}>이메일</Text>
                <Text style={styles.value}>{user.email}</Text>

                <Text style={styles.label}>가입일</Text>
                <Text style={styles.value}>
                    {new Date(user.metadata.creationTime || "").toLocaleString("ko-KR")}
                </Text>

                <Text style={styles.label}>마지막 로그인</Text>
                <Text style={styles.value}>
                    {new Date(user.metadata.lastSignInTime || "").toLocaleString("ko-KR")}
                </Text>

                <View style={styles.statsBox}>
                    <Text style={styles.statItem}>내 게시글 수: {postCount ?? 0}</Text>
                    <Text style={styles.statItem}>
                        내 게시글에 달린 댓글 수: {commentCount ?? 0}
                    </Text>
                </View>

                <View style={styles.recentBox}>
                    <View style={styles.recentHeader}>
                        <Text style={styles.recentTitle}>최근 작성 글</Text>
                        <TouchableOpacity onPress={loadUserStats}>
                            <Text style={styles.refreshText}>새로고침</Text>
                        </TouchableOpacity>
                    </View>

                    {recentPosts.length === 0 ? (
                        <Text style={styles.emptyText}>아직 작성한 글이 없습니다.</Text>
                    ) : (
                        recentPosts.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => router.push(`/post/${p.id}`)}
                                style={styles.postItem}
                            >
                                <Text style={styles.postTitle}>{p.title}</Text>
                                <Text numberOfLines={1} style={styles.postContent}>
                                    {p.content}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => {
                        auth.signOut();
                        Alert.alert("로그아웃", "로그아웃 되었습니다.");
                        router.replace("/login");
                    }}
                >
                    <Text style={styles.logoutText}>로그아웃</Text>
                </TouchableOpacity>
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
        paddingBottom: 60,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noticeText: {
        fontSize: 16,
        color: "#333",
        marginBottom: 16,
    },
    loginButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    loginButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 20,
        color: "#1c1c1e",
    },
    label: {
        fontSize: 14,
        color: "#666",
        marginTop: 10,
    },
    value: {
        fontSize: 16,
        fontWeight: "500",
        marginTop: 4,
        color: "#000",
    },
    statsBox: {
        marginTop: 30,
        padding: 20,
        borderRadius: 12,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e5ea",
    },
    statItem: {
        fontSize: 16,
        marginBottom: 8,
        color: "#1c1c1e",
    },
    recentBox: {
        marginTop: 30,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e5ea",
    },
    recentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    recentTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#1c1c1e",
    },
    refreshText: {
        color: "#007AFF",
        fontWeight: "600",
    },
    emptyText: {
        color: "#8e8e93",
        fontSize: 14,
        marginTop: 4,
    },
    postItem: {
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingVertical: 8,
    },
    postTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1c1c1e",
    },
    postContent: {
        fontSize: 14,
        color: "#555",
    },
    logoutButton: {
        marginTop: 40,
        alignSelf: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: "#ff3b30",
        borderRadius: 10,
    },
    logoutText: {
        color: "#fff",
        fontWeight: "600",
    },
});
