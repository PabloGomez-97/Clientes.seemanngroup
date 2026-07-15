import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WelcomeHeader from "../components/home/WelcomeHeader";
import EjecutivoCard from "../components/home/EjecutivoCard";
import ConsultasGrid from "../components/home/ConsultasGrid";
import { spacing } from "../theme/brand";

const STATUS_NAVY = "#152a45";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [lightStatus, setLightStatus] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLightStatus(true);
      return () => setLightStatus(false);
    }, []),
  );

  return (
    <View style={styles.root}>
      {lightStatus ? <StatusBar style="light" /> : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xl + 20 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <WelcomeHeader topInset={insets.top} />
        <ConsultasGrid />
        <EjecutivoCard />
      </ScrollView>

      {/* Cubre Dynamic Island / status bar al hacer scroll */}
      <View
        pointerEvents="none"
        style={[styles.statusCover, { height: insets.top, backgroundColor: STATUS_NAVY }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#edf1f6",
  },
  content: {
    flexGrow: 1,
  },
  statusCover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
