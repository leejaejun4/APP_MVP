import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

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

  // Firestore에서 게시글 불러오기
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

  return (
    <View style={styles.container}>
      <Button title="새 글 작성" onPress={() => router.push("/(tabs)/new-post")} />

      {posts.length === 0 ? (
        <Text style={styles.empty}>아직 작성된 글이 없습니다.</Text>
      ) : (
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  empty: { marginTop: 20, textAlign: "center", color: "gray" },
  postCard: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  postTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  postContent: { fontSize: 14, color: "#555" },
});
