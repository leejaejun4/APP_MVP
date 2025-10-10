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
} from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../../firebase";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native"; //화면 포커스 시점 감지용 훅

/**
 * Firestore 게시글 데이터 구조 정의
 */
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt?: any;
  userId?: string;
}

/**
 * 게시글 목록 화면 (홈)
 * Firestore에서 게시글을 불러와 목록 형태로 출력하며
 * 로그인 상태 감시, 게시글 삭제, 로그아웃, 새 글 작성 이동 기능을 포함함
 */
export default function PostListScreen() {
  const [posts, setPosts] = useState<Post[]>([]); // 게시글 리스트 상태
  const [currentUser, setCurrentUser] = useState<User | null>(null); // 현재 로그인 사용자
  const router = useRouter(); // Expo Router의 네비게이션 훅

  /**
   * 로그인 상태 실시간 감시
   * Firebase Auth의 onAuthStateChanged로 로그인/로그아웃 여부를 추적함
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe; // 언마운트 시 구독 해제
  }, []);

  /**
   * Firestore에서 게시글 목록을 가져오는 함수
   * createdAt 기준으로 최신순 정렬
   */
  const fetchPosts = async () => {
    try {
      // posts 컬렉션에서 createdAt 필드 기준 내림차순 정렬 쿼리 생성
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      // 문서들을 map으로 순회하며 id + 데이터 병합
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      setPosts(data); // 상태 업데이트
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
      Alert.alert("오류", "게시글을 불러오는 중 문제가 발생했습니다.");
    }
  };

  /**
   * 화면이 포커스될 때마다 Firestore 데이터를 다시 불러옴
   * useEffect는 한 번만 실행되므로, useFocusEffect로 실시간 갱신 구현
   */
  useFocusEffect(
    useCallback(() => {
      fetchPosts(); // 홈으로 돌아올 때마다 새로 데이터 가져옴
    }, [])
  );

  /**
   * 로그아웃 기능
   * Firebase Auth의 signOut 호출 후 로그인 페이지로 이동
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
   * 게시글 상세 화면으로 이동
   * post/[id].tsx로 연결됨
   */
  const handlePostPress = (postId: string) => router.push(`/post/${postId}`);

  /**
   * 게시글 작성 화면으로 이동
   * (tabs)/게시글.tsx 파일로 이동
   */
  const handleCreatePost = () => router.push("/게시글");

  /**
   * 게시글 삭제 기능
   * Firestore에서 문서를 삭제하고 UI 상태에서도 즉시 반영
   */
  const handleDelete = (postId: string) => {
    Alert.alert("삭제 확인", "정말로 이 게시글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", postId)); // Firestore 문서 삭제
            setPosts((prev) => prev.filter((p) => p.id !== postId)); // 상태에서도 제거
          } catch (error) {
            console.error("삭제 오류:", error);
            Alert.alert("오류", "게시글 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  /**
   * 스와이프 시 표시할 오른쪽 삭제 버튼 UI
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
   * 개별 게시글 카드 렌더링
   * 본인 게시글이면 스와이프로 삭제 가능
   */
  const renderItem = ({ item }: { item: Post }) => {
    const isOwner = currentUser?.uid === item.userId; // 작성자 확인

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

    // 본인 글만 스와이프 삭제 가능
    return isOwner ? (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        {card}
      </Swipeable>
    ) : (
      card
    );
  };

  /**
   * 실제 렌더링 구조
   */
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 상단 버튼 (새 글 / 로그인 / 로그아웃) */}
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

        {/* 게시글 리스트 렌더링 */}
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

/**
 * 스타일 정의
 */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f7" },
  container: { flex: 1, paddingHorizontal: 20 },
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
  postTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#1c1c1e",
  },
  postContent: { fontSize: 14, color: "#555" },
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
