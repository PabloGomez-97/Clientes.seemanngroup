import { useCallback, useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ui/ScreenHeader";
import { useAuth } from "../../auth/AuthContext";
import {
  createAdminClient,
  fetchAdminClientUsers,
  fetchAdminEjecutivos,
  updateAdminClient,
  type AdminEjecutivoRow,
  type AdminUserRow,
} from "../../services/adminApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

const EMAIL_DOMAIN = "@seemanngroup.com";

type Prefill = {
  nombreuser?: string;
  usernames?: string[];
  emailPrefix?: string;
  ejecutivoId?: string;
};

type RouteParams = {
  userId?: string;
  prefill?: Prefill;
};

type Nav = {
  goBack: () => void;
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  canGoBack: () => boolean;
};

export default function AdminClientAccountFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;
  const userId = params.userId;
  const isEdit = Boolean(userId);
  const { token } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ejecutivos, setEjecutivos] = useState<AdminEjecutivoRow[]>([]);

  const [emailPrefix, setEmailPrefix] = useState("");
  const [nombreuser, setNombreuser] = useState("");
  const [usernames, setUsernames] = useState<string[]>([""]);
  const [ejecutivoId, setEjecutivoId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [existingEmail, setExistingEmail] = useState("");

  const applyPrefill = useCallback((prefill?: Prefill) => {
    if (!prefill) return;
    if (prefill.nombreuser != null) setNombreuser(prefill.nombreuser);
    if (prefill.usernames != null && prefill.usernames.length > 0) {
      setUsernames(prefill.usernames.map((u) => u || ""));
    }
    if (prefill.emailPrefix != null) setEmailPrefix(prefill.emailPrefix);
    if (prefill.ejecutivoId != null) setEjecutivoId(prefill.ejecutivoId);
  }, []);

  useEffect(() => {
    applyPrefill(params.prefill);
  }, [params.prefill, applyPrefill]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const ejs = await fetchAdminEjecutivos(token);
        if (cancelled) return;
        setEjecutivos(ejs.filter((e) => e.activo));
      } catch {
        if (!cancelled) setEjecutivos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        const users = await fetchAdminClientUsers(token);
        if (cancelled) return;
        const user: AdminUserRow | undefined = users.find(
          (u) => u.id === userId,
        );
        if (!user) {
          setError("No se encontró el cliente.");
          return;
        }
        setExistingEmail(user.email);
        setNombreuser(user.nombreuser || "");
        setUsernames(
          user.usernames?.length
            ? [...user.usernames]
            : user.username
              ? [user.username]
              : [""],
        );
        setEjecutivoId(user.ejecutivo?.id || "");
        const prefix = user.email.split("@")[0] || "";
        setEmailPrefix(prefix);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "No se pudo cargar el cliente.",
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

  const setUsernameAt = (index: number, value: string) => {
    setUsernames((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const addEmpresa = () => setUsernames((prev) => [...prev, ""]);
  const removeEmpresa = (index: number) => {
    setUsernames((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const onSave = async () => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    const cleanedUsernames = usernames.map((u) => u.trim()).filter(Boolean);
    if (!nombreuser.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!cleanedUsernames.length) {
      setError("Debes indicar al menos una empresa.");
      return;
    }
    if (!isEdit && !emailPrefix.trim()) {
      setError("El prefijo de email es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit && userId) {
        await updateAdminClient(token, userId, {
          nombreuser: nombreuser.trim(),
          usernames: cleanedUsernames,
          ejecutivoId: ejecutivoId || null,
          password: password.trim() || undefined,
        });
        Alert.alert("Guardado", "Cliente actualizado correctamente.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        await createAdminClient(token, {
          emailPrefix: emailPrefix.trim(),
          nombreuser: nombreuser.trim(),
          usernames: cleanedUsernames,
          ejecutivoId: ejecutivoId || null,
        });
        Alert.alert("Creado", "Cliente creado correctamente.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar el cliente.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title={isEdit ? "Editar cliente" : "Nuevo cliente"}
        subtitle={isEdit ? existingEmail || undefined : undefined}
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
            {!isEdit ? (
              <Pressable
                style={styles.searchCompanyBtn}
                onPress={() => navigation.navigate("AdminCompanySearch")}
              >
                <Ionicons name="search" size={18} color={brand.primary} />
                <Text style={styles.searchCompanyText}>Buscar empresa</Text>
              </Pressable>
            ) : null}

            <Text style={styles.label}>Email</Text>
            {isEdit ? (
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={existingEmail}
                editable={false}
              />
            ) : (
              <View style={styles.emailRow}>
                <TextInput
                  style={[styles.input, styles.emailPrefix]}
                  value={emailPrefix}
                  onChangeText={(t) =>
                    setEmailPrefix(t.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase())
                  }
                  placeholder="prefijo"
                  placeholderTextColor={brand.mutedLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.emailDomain}>{EMAIL_DOMAIN}</Text>
              </View>
            )}

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombreuser}
              onChangeText={setNombreuser}
              placeholder="Nombre del cliente"
              placeholderTextColor={brand.mutedLight}
            />

            <Text style={styles.label}>Empresas</Text>
            {usernames.map((u, index) => (
              <View key={`empresa-${index}`} style={styles.empresaRow}>
                <TextInput
                  style={[styles.input, styles.empresaInput]}
                  value={u}
                  onChangeText={(t) => setUsernameAt(index, t)}
                  placeholder="Razón social / username"
                  placeholderTextColor={brand.mutedLight}
                  autoCapitalize="none"
                />
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => removeEmpresa(index)}
                  disabled={usernames.length <= 1}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={22}
                    color={
                      usernames.length <= 1 ? brand.mutedLight : "#dc2626"
                    }
                  />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addRowBtn} onPress={addEmpresa}>
              <Ionicons name="add-circle-outline" size={18} color={brand.navy} />
              <Text style={styles.addRowText}>Agregar empresa</Text>
            </Pressable>

            <Text style={styles.label}>Ejecutivo</Text>
            <View style={styles.pickerList}>
              <Pressable
                style={[
                  styles.pickerOption,
                  !ejecutivoId && styles.pickerOptionActive,
                ]}
                onPress={() => setEjecutivoId("")}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    !ejecutivoId && styles.pickerOptionTextActive,
                  ]}
                >
                  Sin ejecutivo
                </Text>
              </Pressable>
              {ejecutivos.map((ej) => {
                const active = ejecutivoId === ej.id;
                return (
                  <Pressable
                    key={ej.id}
                    style={[
                      styles.pickerOption,
                      active && styles.pickerOptionActive,
                    ]}
                    onPress={() => setEjecutivoId(ej.id)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        active && styles.pickerOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {ej.nombre}
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
                  {isEdit ? "Guardar cambios" : "Crear cliente"}
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
  searchCompanyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: brand.primarySoft,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchCompanyText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.primary,
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
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emailPrefix: { flex: 1 },
  emailDomain: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  empresaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  empresaInput: { flex: 1 },
  iconBtn: { padding: 4 },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  addRowText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: brand.navy,
  },
  pickerList: {
    gap: 6,
  },
  pickerOption: {
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pickerOptionActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  pickerOptionText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
  },
  pickerOptionTextActive: {
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
