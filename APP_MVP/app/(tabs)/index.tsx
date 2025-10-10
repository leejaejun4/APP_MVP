/**
 * PostListScreen.tsx
 * iOS 스타일 리디자인 버전
 * - 부드러운 카드 그림자, 노치 대응 SafeArea, 상단 고정 버튼 바
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../../firebase";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

/** 게시글 타입 정의 */
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
  userId?: string;
  userNickname?: string;
}

export default function PostListScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  /** 로그인 감시 */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe;
  }, []);

  /** 게시글 로드 */
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Post[];
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
      Alert.alert("오류", "게시글을 불러오는 중 문제가 발생했습니다.");
    }
  };

  /** 탭 포커스 시 새로고침 */
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  /** 로그아웃 */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("오류", error.message || "로그아웃 실패");
    }
  };

  /** 상세 페이지 이동 */
  const handlePostPress = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  /** 새 글 작성 이동 */
  const handleCreatePost = () => {
    if (!currentUser) {
      Alert.alert("로그인 필요", "로그인 후 글을 작성할 수 있습니다.");
      return;
    }
    router.push("/post");
  };

  /** 게시글 삭제 */
  const handleDelete = (postId: string) => {
    Alert.alert("삭제 확인", "정말로 이 게시글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", postId));
            setPosts((prev) => prev.filter((p) => p.id !== postId));

            if (currentUser) {
              const userRef = doc(db, "users", currentUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                await updateDoc(userRef, { postCount: increment(-1) });
              }
            }

            Alert.alert("완료", "게시글이 삭제되었습니다.");
          } catch (error) {
            console.error("삭제 오류:", error);
            Alert.alert("오류", "게시글 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  /** 스와이프 삭제 버튼 */
  const renderRightActions = (postId: string) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => handleDelete(postId)}
    >
      <Text style={styles.deleteText}>삭제</Text>
    </TouchableOpacity>
  );

  /** 게시글 카드 */
  const renderItem = ({ item }: { item: Post }) => {
    const isOwner = currentUser?.uid === item.userId;

    const card = (
      <TouchableOpacity
        onPress={() => handlePostPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.postCard}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text numberOfLines={2} style={styles.postContent}>
            {item.content}
          </Text>
        </View>
      </TouchableOpacity>
    );

    return isOwner ? (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        {card}
      </Swipeable>
    ) : (
      card
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9FB" />
      {/* 상단 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>게시글</Text>

        <View style={styles.headerButtons}>
          {currentUser ? (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.headerLogout}>로그아웃</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.headerLogout}>로그인</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreatePost}
        >
          <Text style={styles.createButtonText}>＋ 새 글 작성</Text>
        </TouchableOpacity>

        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>아직 작성된 글이 없습니다</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 12 }}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* =======================
   iOS 스타일 스타일링
======================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9F9FB",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#F9F9FB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogout: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  createButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#A1A1A1",
    fontSize: 16,
  },
  postCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  postTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  postContent: {
    fontSize: 15,
    color: "#555",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 6,
    borderRadius: 10,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
