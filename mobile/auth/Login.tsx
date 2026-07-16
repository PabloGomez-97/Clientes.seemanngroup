import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LAST_LOGIN_EMAIL_KEY, useAuth } from "./AuthContext";
import { brand, radii, spacing } from "../theme/brand";
import { fonts } from "../theme/typography";

const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Step = "email" | "password";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recoverVisible, setRecoverVisible] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileKeyRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LAST_LOGIN_EMAIL_KEY);
        if (!cancelled && saved) setEmail(saved);
      } catch {
        // Sin correo guardado.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const animateStep = (next: () => void) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      next();
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
  };

  const resetCaptcha = () => {
    setTurnstileToken(null);
    turnstileKeyRef.current += 1;
  };

  const goToPassword = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setErr(null);
    animateStep(() => {
      setStep("password");
      setTimeout(() => passwordRef.current?.focus(), 100);
    });
  };

  const goBackToEmail = () => {
    setPassword("");
    setShowPassword(false);
    setErr(null);
    setCaptchaRequired(false);
    setTurnstileToken(null);
    animateStep(() => {
      setStep("email");
      setTimeout(() => emailRef.current?.focus(), 100);
    });
  };

  const onSubmit = async () => {
    if (captchaRequired && !turnstileToken) {
      setErr(t("home.login.captchaRequired"));
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const loggedUser = await login(
        email.trim(),
        password,
        turnstileToken ?? undefined,
      );

      if (loggedUser.username === "Ejecutivo") {
        logout();
        setErr(
          loggedUser.roles?.proveedor
            ? t("home.login.proveedorMessage")
            : t("home.login.executiveMessage"),
        );
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (e: unknown) {
      const error = e as { message?: string; requiresCaptcha?: boolean };
      if (error.requiresCaptcha) {
        setCaptchaRequired(true);
        resetCaptcha();
      } else {
        setCaptchaRequired(false);
        setTurnstileToken(null);
      }
      setErr(error.message || t("home.login.loginError"));
      setLoading(false);
    }
  };

  const emailReady = email.trim().length > 0;
  const passwordReady =
    password.length > 0 && !(captchaRequired && !turnstileToken);
  const submitDisabled = loading || !passwordReady;

  const tryLogin = () => {
    if (!submitDisabled) void onSubmit();
  };

  const turnstileHtml =
    TURNSTILE_SITE_KEY &&
    `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      body { margin: 0; display: flex; justify-content: center; background: #f7f8fb; }
    </style>
  </head>
  <body>
    <div
      class="cf-turnstile"
      data-sitekey="${TURNSTILE_SITE_KEY}"
      data-callback="onTurnstileSuccess"
      data-theme="light"
    ></div>
    <script>
      function onTurnstileSuccess(token) {
        window.ReactNativeWebView.postMessage(token);
      }
    </script>
  </body>
</html>`;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={["#f3f5f9", "#fafbfd", "#ffffff"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View
        style={[
          styles.safe,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.topBar}>
          {step === "password" ? (
            <Pressable
              onPress={goBackToEmail}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color={brand.navy} />
              <Text style={styles.backText}>
                {t("home.login.changeEmail", { defaultValue: "Cambiar correo" })}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.topSpacer} />
          )}

          <View style={styles.languageRow}>
            {(["es", "en"] as const).map((lang) => {
              const active = i18n.language?.startsWith(lang);
              return (
                <Pressable
                  key={lang}
                  onPress={() => changeLanguage(lang)}
                  style={[styles.langChip, active && styles.langChipActive]}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      active && styles.langChipTextActive,
                    ]}
                  >
                    {lang.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View style={[styles.body, { opacity: fade }]}>
            <View style={styles.brandBlock}>
              <Image
                source={require("../../src/auth/logoseemann.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.brandAccent} />
              <Text style={styles.brandLine}>Portal Cliente</Text>
            </View>

            <View style={styles.formBlock}>
              {step === "email" ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {t("home.login.emailLabel")}
                  </Text>

                  {err ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{err}</Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.inputShell,
                      focused && styles.inputShellFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={focused ? brand.primary : brand.mutedLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailRef}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="username"
                      autoComplete="username"
                      importantForAutofill="yes"
                      returnKeyType="go"
                      enablesReturnKeyAutomatically
                      placeholder={t("home.login.emailPlaceholder", {
                        defaultValue: "email@seemanngroup.com",
                      })}
                      placeholderTextColor={brand.mutedLight}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onSubmitEditing={goToPassword}
                      style={styles.input}
                    />
                  </View>

                  <Pressable
                    onPress={goToPassword}
                    disabled={!emailReady}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      !emailReady && styles.primaryButtonDisabled,
                      pressed && emailReady && styles.primaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>
                      {t("home.login.continueButton", {
                        defaultValue: "Continuar",
                      })}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setRecoverVisible(true)}
                    hitSlop={10}
                    style={styles.recoverLink}
                  >
                    <Text style={styles.recoverLinkText}>
                      {t("home.login.recoverPassword", {
                        defaultValue: "Recuperar clave",
                      })}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>
                    {t("home.login.passwordLabel")}
                  </Text>
                  <View style={styles.emailChip}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={brand.navy}
                    />
                    <Text style={styles.emailChipText} numberOfLines={1}>
                      {email.trim()}
                    </Text>
                  </View>

                  {err ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{err}</Text>
                    </View>
                  ) : null}

                  <TextInput
                    value={email}
                    editable={false}
                    caretHidden
                    importantForAutofill="yes"
                    textContentType="username"
                    autoComplete="username"
                    style={styles.autofillAnchor}
                  />

                  <View
                    style={[
                      styles.inputShell,
                      focused && styles.inputShellFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={focused ? brand.primary : brand.mutedLight}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordRef}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      importantForAutofill="yes"
                      returnKeyType="go"
                      enablesReturnKeyAutomatically
                      placeholder={t("home.login.passwordPlaceholder")}
                      placeholderTextColor={brand.mutedLight}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onSubmitEditing={tryLogin}
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={brand.muted}
                      />
                    </Pressable>
                  </View>

                  {captchaRequired && turnstileHtml ? (
                    <View style={styles.captchaBox}>
                      <Text style={styles.captchaLabel}>
                        {t("home.login.captchaLabel")}
                      </Text>
                      <WebView
                        key={turnstileKeyRef.current}
                        originWhitelist={["*"]}
                        source={{ html: turnstileHtml }}
                        onMessage={(event) =>
                          setTurnstileToken(event.nativeEvent.data)
                        }
                        style={styles.captchaWebView}
                      />
                    </View>
                  ) : null}

                  <Pressable
                    onPress={tryLogin}
                    disabled={submitDisabled}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      submitDisabled && styles.primaryButtonDisabled,
                      pressed && !submitDisabled && styles.primaryButtonPressed,
                    ]}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.primaryButtonText}>
                          {t("home.login.loggingIn")}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {t("home.login.loginButton")}
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        <Text style={styles.footer}>
          {t("home.login.footer", {
            defaultValue: `© ${new Date().getFullYear()} Seemann Group`,
          })}
        </Text>
      </View>

      <Modal
        visible={recoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecoverVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setRecoverVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalAccent} />
            <Text style={styles.modalTitle}>
              {t("home.login.recoverPassword", {
                defaultValue: "Recuperar clave",
              })}
            </Text>
            <Text style={styles.modalBody}>
              {t("home.login.recoverPasswordMessage", {
                defaultValue:
                  "Debes contactarte con tu ejecutivo de ventas para recuperar tu cuenta/contraseña",
              })}
            </Text>
            <Pressable
              onPress={() => setRecoverVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.primaryButtonText}>
                {t("home.login.recoverPasswordClose", {
                  defaultValue: "Entendido",
                })}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f8fb",
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  orbTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 98, 0, 0.07)",
    top: -90,
    right: -80,
  },
  orbBottom: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(30, 58, 95, 0.05)",
    bottom: -70,
    left: -70,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  topSpacer: {
    width: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    fontSize: 14,
    color: brand.navy,
    fontFamily: fonts.medium,
  },
  languageRow: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(30, 58, 95, 0.08)",
  },
  langChipActive: {
    backgroundColor: brand.primarySoft,
    borderColor: brand.primaryBorder,
  },
  langChipText: {
    fontSize: 12,
    color: brand.muted,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.4,
  },
  langChipTextActive: {
    color: brand.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    paddingBottom: 12,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  logo: {
    width: 210,
    height: 60,
    marginBottom: 16,
  },
  brandAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: brand.primary,
    marginBottom: 12,
  },
  brandLine: {
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: brand.navy,
    fontFamily: fonts.semiBold,
    opacity: 0.75,
  },
  formBlock: {
    width: "100%",
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginBottom: 10,
  },
  emailChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    backgroundColor: brand.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: brand.primaryBorder,
  },
  emailChipText: {
    flexShrink: 1,
    fontSize: 13,
    color: brand.navy,
    fontFamily: fonts.medium,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.medium,
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(30, 58, 95, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    minHeight: 56,
  },
  inputShellFocused: {
    borderColor: brand.primary,
    backgroundColor: "#fffaf7",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: brand.ink,
    fontFamily: fonts.regular,
    paddingVertical: 14,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
  autofillAnchor: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
  },
  primaryButton: {
    backgroundColor: brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryButtonPressed: {
    backgroundColor: brand.primaryDark,
  },
  primaryButtonDisabled: {
    backgroundColor: "#ffc9a8",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.2,
  },
  recoverLink: {
    marginTop: 22,
    alignSelf: "center",
    paddingVertical: 4,
  },
  recoverLinkText: {
    fontSize: 14,
    color: brand.navy,
    fontFamily: fonts.semiBold,
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    color: brand.mutedLight,
    fontSize: 11,
    fontFamily: fonts.medium,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    zIndex: 1,
  },
  modalAccent: {
    alignSelf: "center",
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: brand.primary,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: brand.navy,
    textAlign: "center",
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: brand.muted,
    textAlign: "center",
    marginBottom: 22,
    fontFamily: fonts.regular,
  },
  modalButton: {
    backgroundColor: brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  captchaBox: {
    marginBottom: 16,
  },
  captchaLabel: {
    fontSize: 12,
    color: brand.muted,
    marginBottom: 8,
    fontFamily: fonts.medium,
  },
  captchaWebView: {
    height: 78,
    backgroundColor: "#f7f8fb",
  },
});
