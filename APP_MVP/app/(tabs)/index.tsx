// app/(tabs)/index.tsx

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
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";

// 게시글 데이터 타입 정의
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
  userId?: string;
}

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("오류", error.message || "로그아웃 실패");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 버튼 영역 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/(tabs)/new-post")}
          >
            <Text style={styles.primaryButtonText}>새 글 작성</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
            <Text style={styles.dangerButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 게시글 영역 */}
        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 작성된 글이 없습니다 📝</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/post/${item.id}`)}
                activeOpacity={0.8}
              >
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
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f7", // iOS 배경 톤
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#007AFF", // iOS system blue
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#FF3B30", // iOS system red
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#8e8e93",
    fontSize: 16,
  },
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
  postTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#1c1c1e",
  },
  postContent: {
    fontSize: 14,
    color: "#555",
  },
});
