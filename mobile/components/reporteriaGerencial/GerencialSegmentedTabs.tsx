import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type TabItem<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
};

export default function GerencialSegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: brand.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#e8eef5",
  },
  tabText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: brand.muted,
    textAlign: "center",
  },
  tabTextActive: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
});
