/**
 * PostListScreen.tsx
 * 홈(게시글 목록) 화면
 * - Firestore posts 컬렉션에서 게시글 목록 조회
 * - 로그인 상태 감지 및 로그아웃 처리
 * - 게시글 삭제(작성자 본인만)
 * - 새 글 작성, 상세 페이지 이동
 * - 스와이프 삭제, 탭 포커스 시 자동 새로고침
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

/**
 * Firestore 게시글 구조 정의
 */
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
  userId?: string;
  userNickname?: string;
}

/**
 * 게시글 목록 화면
 */
export default function PostListScreen() {
  const [posts, setPosts] = useState<Post[]>([]); // 게시글 목록
  const [currentUser, setCurrentUser] = useState<User | null>(null); // 현재 로그인 사용자
  const router = useRouter();

  /**
   * 로그인 상태 감시
   * onAuthStateChanged를 통해 로그인/로그아웃 이벤트 추적
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe; // 컴포넌트 언마운트 시 구독 해제
  }, []);

  /**
   * Firestore에서 posts 컬렉션 데이터 조회
   * createdAt 기준으로 내림차순 정렬
   */
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

  /**
   * 탭 이동 시 데이터 새로고침
   * useFocusEffect는 화면이 다시 포커스될 때마다 실행됨
   */
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  /**
   * 로그아웃 처리
   * Firebase Auth signOut 호출 후 로그인 화면으로 리다이렉트
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
      router.replace("/login");
    } catch (error: any) {
      Alert.alert("오류", error.message || "로그아웃 실패");
    }
  };

  /**
   * 게시글 상세 페이지 이동
   * /post/[id].tsx 로 연결
   */
  const handlePostPress = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  /**
   * 새 글 작성 페이지 이동
   * /(tabs)/게시글.tsx 로 이동
   */
  const handleCreatePost = () => {
    if (!currentUser) {
      Alert.alert("로그인 필요", "로그인 후 글을 작성할 수 있습니다.");
      return;
    }
    router.push("/post");
  };

  /**
   * 게시글 삭제
   * 본인 글만 삭제 가능. posts/{id} 문서 삭제 후 UI에서 제거.
   * 동시에 Firestore users/{uid}.postCount를 1 감소시킴.
   */
  const handleDelete = (postId: string) => {
    Alert.alert("삭제 확인", "정말로 이 게시글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            // Firestore에서 게시글 문서 삭제
            await deleteDoc(doc(db, "posts", postId));

            // UI 상태에서 제거
            setPosts((prev) => prev.filter((p) => p.id !== postId));

            // 게시글 카운트 감소 (users/{uid})
            if (currentUser) {
              const userRef = doc(db, "users", currentUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                await updateDoc(userRef, {
                  postCount: increment(-1),
                });
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

  /**
   * 스와이프 시 나타나는 삭제 버튼
   * react-native-gesture-handler Swipeable 사용
   */
  const renderRightActions = (postId: string) => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => handleDelete(postId)}
    >
      <Text style={styles.deleteText}>삭제</Text>
    </TouchableOpacity>
  );

  /**
   * 게시글 카드 UI
   * - 작성자 본인인 경우에만 스와이프 삭제 허용
   */
  const renderItem = ({ item }: { item: Post }) => {
    const isOwner = currentUser?.uid === item.userId;

    const card = (
      <TouchableOpacity
        onPress={() => handlePostPress(item.id)}
        activeOpacity={0.8}
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

  /**
   * 렌더링 구성
   * - 상단에 새 글 / 로그인 / 로그아웃 버튼 표시
   * - 게시글이 없으면 안내 문구 표시
   */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 상단 버튼 영역 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreatePost}
          >
            <Text style={styles.primaryButtonText}>새 글 작성</Text>
          </TouchableOpacity>

          {currentUser ? (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLogout}
            >
              <Text style={styles.dangerButtonText}>로그아웃</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 게시글 리스트 */}
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
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ===========================
   스타일 정의
=========================== */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f7",
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
    backgroundColor: "#007AFF",
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
    backgroundColor: "#FF3B30",
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
  loginButton: {
    flex: 1,
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  loginButtonText: {
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
