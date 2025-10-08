import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../../firebase";

// Firestore 게시글 타입 정의
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
  userId?: string;
}

export default function PostListScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  // 로그인 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe;
  }, []);

  // Firestore에서 게시글 불러오기
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Post[];
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
      Alert.alert("오류", "게시글을 불러오는 중 문제가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("오류", error.message || "로그아웃 실패");
    }
  };

  // 로그인 화면 이동
  const handleLogin = () => router.push("/login");

  // 게시글 상세 화면 이동
  const handlePostPress = (postId: string) => router.push(`/post/${postId}`);

  // 게시글 작성 화면 이동
  const handleCreatePost = () => router.push("/게시글");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreatePost}>
            <Text style={styles.primaryButtonText}>새 글 작성</Text>
          </TouchableOpacity>

          {currentUser ? (
            <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
              <Text style={styles.dangerButtonText}>로그아웃</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 작성된 글이 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handlePostPress(item.id)} activeOpacity={0.8}>
                <View style={styles.postCard}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.postContent}>
                    {item.content}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { flex: 1, paddingHorizontal: 20 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, marginBottom: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dangerButton: {
    flex: 1,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  dangerButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loginButton: {
    flex: 1,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#8e8e93", fontSize: 16 },
  postCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  postTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6, color: "#1c1c1e" },
  postContent: { fontSize: 14, color: "#555" },
});
