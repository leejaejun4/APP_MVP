// app/(tabs)/index.tsx

import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";

// 게시글 데이터 타입 정의
interface Post {
  id: string;         // 문서 ID (Firestore에서 자동 생성)
  title: string;      // 게시글 제목
  content: string;    // 게시글 내용
  createdAt?: any;    // 생성 시간 (serverTimestamp 사용)
  userId?: string;    // 작성자 UID
}

export default function HomeScreen() {
  // posts 상태: Firestore에서 불러온 게시글 목록
  const [posts, setPosts] = useState<Post[]>([]);
  const router = useRouter();

  /**
   * Firestore에서 게시글을 불러오는 함수
   * - posts 컬렉션에서 createdAt 필드를 기준으로 내림차순 정렬
   * - getDocs()로 일회성으로 가져와서 posts 상태에 저장
   */
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,       // 문서 ID
        ...doc.data(),    // 문서 필드 전체를 풀어서 저장
      })) as Post[];
      setPosts(data);
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
    }
  };

  // 컴포넌트가 처음 마운트될 때 게시글을 불러옴
  useEffect(() => {
    fetchPosts();
  }, []);

  /**
   * 로그아웃 처리 함수
   * - Firebase 인증 세션을 signOut으로 종료
   * - 성공 시 알림을 띄우고 로그인 화면으로 리다이렉트
   */
  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase 인증 세션 종료
      Alert.alert("로그아웃", "성공적으로 로그아웃되었습니다.");
      router.replace("/login"); // 로그인 화면으로 이동
    } catch (error: any) {
      Alert.alert("오류", error.message || "로그아웃 실패");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 새 글 작성 버튼 */}
        <Button
          title="새 글 작성"
          onPress={() => router.push("/(tabs)/new-post")}
        />

        {/* 로그아웃 버튼 - 빨간색 강조 */}
        <View style={{ marginTop: 10 }}>
          <Button title="로그아웃" color="red" onPress={handleLogout} />
        </View>

        {/* 게시글이 없을 경우 안내 메시지 */}
        {posts.length === 0 ? (
          <Text style={styles.empty}>아직 작성된 글이 없습니다.</Text>
        ) : (
          /**
           * 게시글 목록을 FlatList로 렌더링
           * - keyExtractor: 각 아이템의 고유 ID 반환
           * - renderItem: 게시글 카드 UI를 구성
           * - TouchableOpacity로 감싸서 누르면 상세 화면 이동
           */
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => router.push(`/post/${item.id}`)}>
                <View style={styles.postCard}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.postContent}>
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

// 화면 스타일 정의
const styles = StyleSheet.create({
  // SafeAreaView: iOS 노치 영역까지 안전하게 레이아웃 보장
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // 메인 컨테이너: 전체 레이아웃 구성
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  // 게시글이 없을 때 표시되는 안내 문구
  empty: { marginTop: 20, textAlign: "center", color: "gray" },
  // 게시글 카드 UI
  postCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  // 게시글 제목 스타일
  postTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  // 게시글 본문 요약 스타일
  postContent: { fontSize: 14, color: "#555" },
});
