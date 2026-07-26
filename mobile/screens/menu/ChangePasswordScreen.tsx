import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { changePasswordRequest } from "../../services/changePasswordApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const onSubmit = async () => {
    if (!token) return;
    if (!currentPassword || !newPassword) {
      Alert.alert("Completa los campos", "Ingresa la contraseña actual y la nueva.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Contraseña débil", "La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("No coinciden", "La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      await changePasswordRequest(token, currentPassword, newPassword);
      Alert.alert("Listo", "Contraseña actualizada correctamente.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={brand.navy} />
        </Pressable>
        <Text style={styles.topTitle}>Cambiar contraseña</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.form}>
          {(
            [
              ["Contraseña actual", currentPassword, setCurrentPassword],
              ["Nueva contraseña", newPassword, setNewPassword],
              ["Confirmar nueva", confirmPassword, setConfirmPassword],
            ] as const
          ).map(([label, value, setter]) => (
            <View key={label} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ))}

          <Pressable onPress={() => setShow((v) => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.submit, loading && styles.submitDisabled]}
            onPress={() => void onSubmit()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  form: { padding: spacing.lg, gap: spacing.md },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  inputRow: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 12,
  },
  input: {
    height: 46,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  toggle: { alignSelf: "flex-start" },
  toggleText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.primary,
  },
  submit: {
    marginTop: spacing.sm,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.7 },
  submitText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
