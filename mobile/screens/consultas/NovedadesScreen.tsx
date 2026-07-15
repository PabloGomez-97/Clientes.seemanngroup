import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ui/ScreenHeader";
import type { MenuStackParamList } from "../../navigation/MenuStack";
import {
  fetchBlogPosts,
  type MobileBlogPost,
} from "../../services/contentful";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Nav = NativeStackNavigationProp<MenuStackParamList, "Novedades">;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function NovedadesScreen() {
  const navigation = useNavigation<Nav>();
  const [posts, setPosts] = useState<MobileBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBlogPosts(20);
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar novedades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const renderItem = ({ item }: { item: MobileBlogPost }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        navigation.navigate("NovedadDetail", {
          slug: item.slug,
          title: item.title,
        })
      }
    >
      {item.featuredImageUrl ? (
        <Image
          source={{ uri: item.featuredImageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Ionicons name="newspaper-outline" size={28} color={brand.primary} />
        </View>
      )}
      <View style={styles.body}>
        {item.category ? (
          <Text style={styles.category}>{item.category}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={3}>
            {item.excerpt}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {formatDate(item.publishDate)}
          {item.author ? ` · ${item.author}` : ""}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Novedades"
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.iconBtn} onPress={() => void load()}>
            <Ionicons name="refresh" size={18} color={brand.navy} />
          </Pressable>
        }
      />

      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void load()}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No hay novedades por ahora</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 12 },
  card: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.92 },
  image: { width: "100%", height: 150, backgroundColor: brand.canvasAlt },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.md },
  category: {
    fontSize: 11,
    fontWeight: "700",
    color: brand.primary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: brand.ink,
    marginBottom: 6,
  },
  excerpt: { fontSize: 13, color: brand.muted, lineHeight: 18, marginBottom: 8 },
  meta: { fontSize: 12, color: brand.inkSecondary },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  error: { color: brand.muted, textAlign: "center", marginBottom: 12 },
  retry: {
    backgroundColor: brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  retryText: { color: "#fff", fontFamily: fonts.semiBold },
  empty: { color: brand.muted },
});
