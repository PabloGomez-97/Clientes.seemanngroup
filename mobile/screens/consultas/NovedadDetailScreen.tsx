import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import ScreenHeader from "../../components/ui/ScreenHeader";
import type { MenuStackParamList } from "../../navigation/MenuStack";
import {
  fetchBlogPostBySlug,
  richTextToPlain,
  type MobileBlogPost,
} from "../../services/contentful";
import { brand, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Route = RouteProp<MenuStackParamList, "NovedadDetail">;

export default function NovedadDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { slug, title } = route.params;
  const [post, setPost] = useState<MobileBlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBlogPostBySlug(slug);
        if (!cancelled) setPost(data);
        if (!cancelled && !data) setError("Artículo no encontrado");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const body = richTextToPlain(post?.content || null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={post?.title || title || "Novedad"}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {post?.featuredImageUrl ? (
            <Image
              source={{ uri: post.featuredImageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}
          {post?.excerpt ? (
            <Text style={styles.excerpt}>{post.excerpt}</Text>
          ) : null}
          <Text style={styles.body}>
            {body || "Sin contenido disponible para este artículo."}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: spacing.md,
    backgroundColor: brand.canvasAlt,
  },
  excerpt: {
    fontSize: 15,
    color: brand.inkSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
    fontFamily: fonts.semiBold,
  },
  body: { fontSize: 15, color: brand.ink, lineHeight: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  error: { color: brand.muted, textAlign: "center" },
});
