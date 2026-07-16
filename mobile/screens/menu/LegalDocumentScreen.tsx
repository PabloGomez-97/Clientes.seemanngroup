import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type {
  LegalBlock,
  LegalDocument,
} from "../../content/privacyPolicy";
import { privacyPolicyDocument } from "../../content/privacyPolicy";
import { termsOfServiceDocument } from "../../content/termsOfService";
import type { MenuStackParamList } from "../../navigation/MenuStack";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type Route = RouteProp<MenuStackParamList, "LegalDocument">;

const DOCS: Record<"privacy" | "terms", LegalDocument> = {
  privacy: privacyPolicyDocument,
  terms: termsOfServiceDocument,
};

function maybeOpenLink(value: string) {
  if (value.includes("@") && !value.includes(" ")) {
    void Linking.openURL(`mailto:${value}`);
    return;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    void Linking.openURL(value);
    return;
  }
  if (value.startsWith("+") || /^\d[\d\s]+$/.test(value)) {
    void Linking.openURL(`tel:${value.replace(/\s/g, "")}`);
  }
}

function BlockView({ block }: { block: LegalBlock }) {
  if (block.type === "para") {
    return <Text style={styles.para}>{block.text}</Text>;
  }

  if (block.type === "bullets") {
    return (
      <View style={styles.bulletList}>
        {block.items.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "kv") {
    return (
      <View style={styles.kvCard}>
        {block.items.map((item) => (
          <Pressable
            key={item.label}
            style={styles.kvRow}
            onPress={() => maybeOpenLink(item.value)}
          >
            <Text style={styles.kvLabel}>{item.label}</Text>
            <Text style={styles.kvValue}>{item.value}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (block.type === "callout") {
    return (
      <View style={styles.callout}>
        <Text style={styles.calloutTitle}>{block.title}</Text>
        <Text style={styles.calloutText}>{block.text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        {block.headers.map((header) => (
          <Text key={header} style={styles.tableHeaderCell}>
            {header}
          </Text>
        ))}
      </View>
      {block.rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={[
            styles.tableRow,
            rowIndex % 2 === 1 && styles.tableRowAlt,
          ]}
        >
          {row.map((cell, cellIndex) => (
            <Text key={`${rowIndex}-${cellIndex}`} style={styles.tableCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function LegalDocumentScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const doc = DOCS[route.params.doc];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={styles.backBtn}
        accessibilityLabel="Volver"
      >
        <Ionicons name="chevron-back" size={26} color={brand.navy} />
      </Pressable>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.badge}>Documento legal</Text>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.meta}>
          Última actualización: {doc.lastUpdated}
          {"\n"}
          Vigente desde: {doc.effectiveDate}
        </Text>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>{doc.introTitle}</Text>
          <Text style={styles.introText}>{doc.introText}</Text>
        </View>

        {doc.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionNumber}>{section.number}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionBody}>
              {section.blocks.map((block, index) => (
                <BlockView key={`${section.id}-${index}`} block={block} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginLeft: spacing.lg - 4,
    paddingVertical: 4,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  badge: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.primary,
    backgroundColor: brand.primarySoft,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fonts.bold,
    color: brand.ink,
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: brand.muted,
    marginTop: -8,
  },
  introCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    padding: spacing.md,
    gap: 8,
  },
  introTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: brand.primaryDark,
  },
  introText: {
    fontSize: 15,
    lineHeight: 23,
    color: brand.inkSecondary,
  },
  section: {
    gap: 8,
  },
  sectionNumber: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.bold,
    color: brand.ink,
  },
  sectionBody: {
    gap: 12,
    marginTop: 4,
  },
  para: {
    fontSize: 15,
    lineHeight: 24,
    color: brand.inkSecondary,
  },
  bulletList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 14,
    fontSize: 15,
    lineHeight: 24,
    color: brand.primary,
    fontFamily: fonts.bold,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: brand.inkSecondary,
  },
  kvCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  kvRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    gap: 4,
  },
  kvLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  kvValue: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  callout: {
    backgroundColor: brand.canvasAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.md,
    gap: 6,
  },
  calloutTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  calloutText: {
    fontSize: 14,
    lineHeight: 21,
    color: brand.inkSecondary,
  },
  table: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: brand.surface,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: brand.primarySoft,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.primaryDark,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  tableRowAlt: {
    backgroundColor: brand.canvasAlt,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: brand.inkSecondary,
  },
});
