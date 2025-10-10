import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
 * ProfileScreen (iOS 스타일)
 * - 로직 동일
 * - 디자인만 Apple 스타일로 개선
 */
export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [postCount, setPostCount] = useState<number | null>(null);
    const [commentCount, setCommentCount] = useState<number | null>(null);
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

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
                    style={styles.primaryButton}
                    onPress={() => router.replace("/login")}
                >
                    <Text style={styles.primaryButtonText}>로그인 하러 가기</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#007aff" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={[
                styles.safeArea,
                { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
            ]}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>내 프로필</Text>

                {/* 사용자 정보 */}
                <View style={styles.card}>
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
                </View>

                {/* 통계 */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>활동 통계</Text>
                    <Text style={styles.statItem}>내 게시글 수: {postCount ?? 0}</Text>
                    <Text style={styles.statItem}>댓글 수: {commentCount ?? 0}</Text>
                </View>

                {/* 최근 게시글 */}
                <View style={styles.card}>
                    <View style={styles.recentHeader}>
                        <Text style={styles.sectionTitle}>최근 작성 글</Text>
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

                {/* 로그아웃 */}
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
        backgroundColor: "#f9f9fb",
    },
    container: {
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9f9fb",
    },
    noticeText: {
        fontSize: 16,
        color: "#333",
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: "#111",
        marginVertical: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: "#eee",
    },
    label: {
        fontSize: 13,
        color: "#8e8e93",
        marginTop: 10,
    },
    value: {
        fontSize: 16,
        fontWeight: "500",
        color: "#111",
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#1c1c1e",
        marginBottom: 8,
    },
    statItem: {
        fontSize: 16,
        color: "#1c1c1e",
        marginTop: 4,
    },
    recentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    refreshText: {
        color: "#007aff",
        fontWeight: "600",
    },
    emptyText: {
        color: "#8e8e93",
        fontSize: 14,
        marginTop: 6,
    },
    postItem: {
        borderTopWidth: 1,
        borderTopColor: "#f2f2f4",
        paddingVertical: 10,
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
    primaryButton: {
        backgroundColor: "#007aff",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        shadowColor: "#007aff",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    logoutButton: {
        backgroundColor: "#ff3b30",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 16,
        shadowColor: "#ff3b30",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    logoutText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
