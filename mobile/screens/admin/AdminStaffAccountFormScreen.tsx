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
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useAuth } from "../../auth/AuthContext";
import {
  ADMIN_ROLE_OPTIONS,
  createAdminEjecutivoAccount,
  fetchAdminEjecutivos,
  fetchAdminStaffUsers,
  singleRoleFromRoles,
  updateAdminEjecutivoUser,
  type AdminStaffRoleKey,
} from "../../services/adminApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type RouteParams = {
  userId?: string;
};

type Nav = {
  goBack: () => void;
};

export default function AdminStaffAccountFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;
  const userId = params.userId;
  const isEdit = Boolean(userId);
  const { token } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [nombreuser, setNombreuser] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idInterno, setIdInterno] = useState("");
  const [role, setRole] = useState<AdminStaffRoleKey>("ejecutivo");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [staff, ejecutivos] = await Promise.all([
          fetchAdminStaffUsers(token),
          fetchAdminEjecutivos(token),
        ]);
        if (cancelled) return;
        const user = staff.find((u) => u.id === userId);
        if (!user) {
          setError("No se encontró la cuenta.");
          return;
        }
        const ej = ejecutivos.find(
          (e) =>
            e.email.trim().toLowerCase() === user.email.trim().toLowerCase(),
        );
        setEmail(user.email);
        setNombreuser(user.nombreuser || ej?.nombre || "");
        setTelefono(ej?.telefono || "");
        setIdInterno(
          ej?.idInterno != null && !Number.isNaN(ej.idInterno)
            ? String(ej.idInterno)
            : "",
        );
        setRole(singleRoleFromRoles(ej?.roles) || "ejecutivo");
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo cargar la cuenta.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const onSave = async () => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!nombreuser.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!telefono.trim()) {
      setError("El teléfono es obligatorio.");
      return;
    }
    const parsedId = Number(String(idInterno).trim());
    if (!String(idInterno).trim() || Number.isNaN(parsedId)) {
      setError("El ID interno debe ser un número válido.");
      return;
    }
    if (!isEdit) {
      if (!email.trim() || !email.includes("@")) {
        setError("Ingresa un email válido.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && userId) {
        await updateAdminEjecutivoUser(token, userId, {
          nombreuser: nombreuser.trim(),
          telefono: telefono.trim(),
          idInterno: parsedId,
          role,
          password: password.trim() || undefined,
        });
        Alert.alert("Guardado", "Ejecutivo actualizado correctamente.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await createAdminEjecutivoAccount(token, {
          email: email.trim(),
          nombreuser: nombreuser.trim(),
          telefono: telefono.trim(),
          idInterno: parsedId,
          role,
        });
        Alert.alert("Creado", "Ejecutivo creado correctamente.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar el ejecutivo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={isEdit ? "Editar ejecutivo" : "Nuevo ejecutivo"}
        subtitle={isEdit ? email || undefined : undefined}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, isEdit && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              editable={!isEdit}
              placeholder="nombre@seemanngroup.com"
              placeholderTextColor={brand.mutedLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombreuser}
              onChangeText={setNombreuser}
              placeholder="Nombre completo"
              placeholderTextColor={brand.mutedLight}
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="+56 9 …"
              placeholderTextColor={brand.mutedLight}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>ID interno</Text>
            <TextInput
              style={styles.input}
              value={idInterno}
              onChangeText={(t) => setIdInterno(t.replace(/[^\d]/g, ""))}
              placeholder="Número interno"
              placeholderTextColor={brand.mutedLight}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Rol</Text>
            <View style={styles.roleList}>
              {ADMIN_ROLE_OPTIONS.map((opt) => {
                const active = role === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.roleOption,
                      active && styles.roleOptionActive,
                    ]}
                    onPress={() => setRole(opt.key)}
                  >
                    <View
                      style={[styles.radio, active && styles.radioActive]}
                    >
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.roleText,
                        active && styles.roleTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isEdit ? (
              <>
                <Text style={styles.label}>Nueva contraseña (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={brand.mutedLight}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            ) : null}

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => void onSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? "Guardar cambios" : "Crear ejecutivo"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: 8,
  },
  label: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  input: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: brand.ink,
  },
  inputDisabled: {
    backgroundColor: brand.canvasAlt,
    color: brand.muted,
  },
  roleList: { gap: 6 },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  roleOptionActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: brand.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: brand.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.primary,
  },
  roleText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
  },
  roleTextActive: {
    fontFamily: fonts.semiBold,
    color: brand.primary,
  },
  errorBanner: {
    marginTop: 8,
    color: "#dc2626",
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
