import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { CotizadorStackParamList } from "../../../navigation/CotizadorStack";
import { MOBILE_API_BASE } from "../../../../src/auth/authApi";
import { useAuth } from "../../../auth/AuthContext";
import { isStaffUser } from "../../../auth/portalRouting";
import QuoteAirStep1 from "./QuoteAirStep1";
import QuoteAirStep2 from "./QuoteAirStep2";
import type { AirStep2Result, AirStep3Result } from "./airWizardTypes";
import { brand, spacing } from "../../../theme/brand";
import { fonts } from "../../../theme/typography";

type Nav = NativeStackNavigationProp<CotizadorStackParamList, "QuoteAir">;
type R = RouteProp<CotizadorStackParamList, "QuoteAir">;

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Ruta", "Cargamento", "Servicios", "Revisión"] as const;

export default function QuoteAirWizardScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { user, token } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [step1, setStep1] = useState<
    import("./QuoteAirStep1").AirStep1Result | null
  >(null);
  const [step2, setStep2] = useState<AirStep2Result | null>(null);
  const [step3, setStep3] = useState<AirStep3Result | null>(null);
  const [profitMarkupPct, setProfitMarkupPct] = useState(15);

  // Lazy require: evita cargar addons/PDF nativo al montar el wizard.
  const QuoteAirStep3 =
    step >= 3 ? require("./QuoteAirStep3").default : null;
  const QuoteAirStep4 =
    step >= 4 ? require("./QuoteAirStep4").default : null;

  const clientLabel = useMemo(() => {
    return route.params?.clientName || route.params?.clientUsername || null;
  }, [route.params?.clientName, route.params?.clientUsername]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const staff = isStaffUser(user);
        const qs = staff ? "" : "?forSelf=1";
        const res = await fetch(
          `${MOBILE_API_BASE}/api/profit-markup/effective${qs}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        const air = Number(data?.effective?.air ?? data?.markup?.air ?? 15);
        if (!cancelled && Number.isFinite(air)) setProfitMarkupPct(air);
      } catch {
        // default 15
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const goBackStep = () => {
    if (step === 1) {
      navigation.goBack();
      return;
    }
    setStep((s) => (s - 1) as WizardStep);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={goBackStep} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={brand.navy} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Cotizador aéreo</Text>
          {clientLabel ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {clientLabel}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.steps}>
        {STEP_LABELS.map((label, index) => {
          const n = (index + 1) as WizardStep;
          const active = n === step;
          const done = n < step;
          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  active && styles.stepDotActive,
                  done && styles.stepDotDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotText,
                    (active || done) && styles.stepDotTextOn,
                  ]}
                >
                  {n}
                </Text>
              </View>
              <Text
                style={[styles.stepLabel, active && styles.stepLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <QuoteAirStep1
            onConfirm={(result) => {
              setStep1(result);
              setStep2(null);
              setStep3(null);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 && step1 ? (
          <QuoteAirStep2
            step1={step1}
            onConfirm={(result) => {
              setStep2(result);
              setStep3(null);
              setStep(3);
            }}
          />
        ) : null}

        {step === 3 && step1 && step2 && QuoteAirStep3 ? (
          <QuoteAirStep3
            step1={step1}
            step2={step2}
            profitMarkupPct={profitMarkupPct}
            onConfirm={(result: AirStep3Result) => {
              setStep3(result);
              setStep(4);
            }}
          />
        ) : null}

        {step === 4 && step1 && step2 && step3 && QuoteAirStep4 ? (
          <QuoteAirStep4
            step1={step1}
            step2={step2}
            step3={step3}
            clientUsername={route.params?.clientUsername}
            clientName={route.params?.clientName}
            profitMarkupPct={profitMarkupPct}
            onCloseHome={() => {
              // Sube al tab navigator y vuelve al inicio (Dashboard / Home).
              let nav: typeof navigation | undefined = navigation;
              let tabNav: typeof navigation | undefined;
              while (nav) {
                const state = nav.getState?.();
                const names = state?.routeNames as string[] | undefined;
                if (
                  names?.includes("Dashboard") ||
                  names?.includes("Home")
                ) {
                  tabNav = nav;
                  break;
                }
                nav = nav.getParent?.() as typeof navigation | undefined;
              }
              if (tabNav) {
                const names = tabNav.getState().routeNames as string[];
                const home = names.includes("Dashboard")
                  ? "Dashboard"
                  : names.includes("Home")
                    ? "Home"
                    : names[0];
                // @ts-expect-error tab route names vary by portal role
                tabNav.navigate(home);
                return;
              }
              navigation.popToTop();
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    backgroundColor: brand.surface,
  },
  headerText: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  steps: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: brand.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  stepItem: { flex: 1, alignItems: "center", gap: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: brand.canvas,
    borderWidth: 1,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: brand.navy,
    borderColor: brand.navy,
  },
  stepDotDone: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  stepDotText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  stepDotTextOn: { color: "#fff" },
  stepLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  stepLabelActive: { color: brand.navy, fontFamily: fonts.semiBold },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
});
