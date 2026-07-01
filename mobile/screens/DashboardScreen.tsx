import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WelcomeHeader from "../components/home/WelcomeHeader";
import HomeServicesGrid from "../components/home/HomeServicesGrid";
import EjecutivoCard from "../components/home/EjecutivoCard";
import { brand, spacing } from "../theme/brand";

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WelcomeHeader />
        <View style={styles.body}>
          <HomeServicesGrid />
          <EjecutivoCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: brand.canvas,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
