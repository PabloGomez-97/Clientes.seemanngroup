import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ChipEditor from "../../components/tracking/ChipEditor";
import { useAuth } from "../../auth/AuthContext";
import {
  createOceanShipment,
  fetchMobileTrackingEmailPreference,
  isValidTrackingEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  mergeTrackingEmails,
  saveMobileTrackingEmailPreference,
} from "../../services/shipsgoApi";
import { validateOceanIdentifier } from "../../../src/services/shipsgoTrackingLogic";
import type { TrackeosStackParamList } from "../../navigation/TrackeosStack";
import { brand, radii, spacing } from "../../theme/brand";

type NavigationProp = NativeStackNavigationProp<
  TrackeosStackParamList,
  "NewOceanTracking"
>;

export default function NewOceanTrackingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { token, activeUsername } = useAuth();
  const [identifierType, setIdentifierType] = useState<
    "container_number" | "booking_number"
  >("container_number");
  const [identifierValue, setIdentifierValue] = useState("");
  const [followers, setFollowers] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifierValidation = validateOceanIdentifier(
    identifierType,
    identifierValue,
  );

  useEffect(() => {
    if (!token || !activeUsername) return;
    void fetchMobileTrackingEmailPreference(token, activeUsername)
      .then((preference) => setSavedEmails(preference.emails))
      .catch(() => setSavedEmails([]));
  }, [token, activeUsername]);

  const handleSubmit = async () => {
    if (!token || !activeUsername) {
      setError("No hay sesión activa.");
      return;
    }
    if (!identifierValidation.valid) {
      setError(
        identifierType === "container_number"
          ? "El número de contenedor debe tener formato XXXX1234567."
          : "El número de booking tiene un formato inválido.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        reference: activeUsername,
        carrier: "SG_XXXX",
        followers,
        tags,
      };

      if (identifierType === "container_number") {
        body.container_number = identifierValue.toUpperCase();
      } else {
        body.booking_number = identifierValue;
      }

      const shipment = await createOceanShipment(token, body);

      const merged = mergeTrackingEmails(savedEmails, followers);
      if (merged.added.length > 0) {
        await saveMobileTrackingEmailPreference(
          token,
          activeUsername,
          merged.emails,
        );
      }

      Alert.alert(
        "Seguimiento creado",
        "Tu envío marítimo fue registrado correctamente.",
        [
          {
            text: "Ver tracking",
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: "TrackeosList" },
                  { name: "OceanDetail", params: { shipment } },
                ],
              });
            },
          },
        ],
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Error al crear el trackeo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Nuevo seguimiento marítimo</Text>
          <Text style={styles.subtitle}>
            Registra un contenedor o booking para monitorear tu envío.
          </Text>

          <Text style={styles.label}>Cliente</Text>
          <TextInput
            value={activeUsername || ""}
            editable={false}
            style={[styles.input, styles.inputDisabled]}
          />

          <View style={styles.typeRow}>
            {(["container_number", "booking_number"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setIdentifierType(type);
                  setIdentifierValue("");
                }}
                style={[
                  styles.typeChip,
                  identifierType === type && styles.typeChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    identifierType === type && styles.typeChipTextActive,
                  ]}
                >
                  {type === "container_number" ? "Contenedor" : "Booking"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>
            {identifierType === "container_number"
              ? "Número de contenedor *"
              : "Número de booking *"}
          </Text>
          <TextInput
            value={identifierValue}
            onChangeText={setIdentifierValue}
            placeholder={
              identifierType === "container_number" ? "MSCU1234567" : "BK-12345"
            }
            autoCapitalize={
              identifierType === "container_number" ? "characters" : "none"
            }
            style={[
              styles.input,
              identifierValue &&
                !identifierValidation.valid &&
                styles.inputInvalid,
              identifierValue &&
                identifierValidation.valid &&
                styles.inputValid,
            ]}
          />
          {identifierValue ? (
            <Text
              style={[
                styles.helper,
                identifierValidation.valid
                  ? styles.helperOk
                  : styles.helperError,
              ]}
            >
              {identifierValidation.message}
            </Text>
          ) : null}

          <ChipEditor
            label="Etiquetas"
            placeholder="Escribe una etiqueta"
            values={tags}
            maxItems={10}
            onChange={setTags}
          />

          <ChipEditor
            label="Notificaciones"
            placeholder="correo@ejemplo.com"
            values={followers}
            maxItems={MAX_VISIBLE_TRACK_FOLLOWERS}
            onChange={setFollowers}
            keyboardType="email-address"
            validate={isValidTrackingEmail}
            suggestions={savedEmails}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("TrackeosList")}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                (!identifierValidation.valid || loading) &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={!identifierValidation.valid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Crear seguimiento</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: brand.muted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.inkSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: brand.ink,
    marginBottom: 8,
  },
  inputDisabled: {
    backgroundColor: brand.canvasAlt,
    color: brand.muted,
  },
  inputInvalid: { borderColor: "#dc2626" },
  inputValid: { borderColor: "#16a34a" },
  helper: {
    fontSize: 12,
    color: brand.muted,
    marginBottom: 16,
  },
  helperOk: { color: "#16a34a" },
  helperError: { color: "#dc2626" },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  typeChipActive: {
    borderColor: brand.primary,
    backgroundColor: brand.primarySoft,
  },
  typeChipText: {
    fontSize: 13,
    color: brand.muted,
    fontWeight: "500",
  },
  typeChipTextActive: {
    color: brand.primary,
    fontWeight: "700",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: brand.surface,
  },
  secondaryButtonText: {
    color: brand.inkSecondary,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: { backgroundColor: "#ccc" },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
