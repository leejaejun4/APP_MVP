import { Image } from "expo-image";
import { Platform, StyleSheet, View } from "react-native";

import { Collapsible } from "@/components/ui/collapsible";
import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#f5f5f7", dark: "#1c1c1e" }}
      headerImage={
        <IconSymbol
          size={200}
          color="rgba(128,128,128,0.25)"
          name="sparkles"
          style={styles.headerImage}
        />
      }
    >
      {/* Title */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
            fontSize: 34,
            fontWeight: "700",
            textAlign: "center",
            flex: 1,
          }}
        >
          Explore
        </ThemedText>
      </ThemedView>

      <ThemedText style={styles.subtitle}>
        Start exploring features with a clean iOS-inspired layout.
      </ThemedText>

      {/* Collapsible Sections */}
      <View style={styles.section}>
        <Collapsible title="File-based routing">
          <ThemedText>
            Two main screens:{" "}
            <ThemedText type="defaultSemiBold">index.tsx</ThemedText> and{" "}
            <ThemedText type="defaultSemiBold">explore.tsx</ThemedText>.
          </ThemedText>
          <ExternalLink href="https://docs.expo.dev/router/introduction">
            <ThemedText type="link">Learn more</ThemedText>
          </ExternalLink>
        </Collapsible>
      </View>

      <View style={styles.section}>
        <Collapsible title="Images">
          <Image
            source={require("@/assets/images/react-logo.png")}
            style={styles.logo}
          />
          <ExternalLink href="https://reactnative.dev/docs/images">
            <ThemedText type="link">Learn more</ThemedText>
          </ExternalLink>
        </Collapsible>
      </View>

      <View style={styles.section}>
        <Collapsible title="Animations">
          <ThemedText>
            This template includes{" "}
            <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
              react-native-reanimated
            </ThemedText>{" "}
            examples for smooth animations.
          </ThemedText>
          {Platform.OS === "ios" && (
            <ThemedText>
              Parallax headers provide a premium feel on iOS devices.
            </ThemedText>
          )}
        </Collapsible>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -40,
    position: "absolute",
    alignSelf: "center",
  },
  titleContainer: {
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginVertical: 12,
  },
});
