import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
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

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recoverVisible, setRecoverVisible] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileKeyRef = useRef(0);

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
    setStep("password");
    setTimeout(() => passwordRef.current?.focus(), 80);
  };

  const goBackToEmail = () => {
    setPassword("");
    setErr(null);
    setCaptchaRequired(false);
    setTurnstileToken(null);
    setStep("email");
    setTimeout(() => emailRef.current?.focus(), 80);
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
      body { margin: 0; display: flex; justify-content: center; background: #fff; }
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
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        {step === "password" ? (
          <Pressable onPress={goBackToEmail} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>
              {t("home.login.changeEmail", { defaultValue: "Cambiar correo" })}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}

        <View style={styles.languageRow}>
          {(["es", "en"] as const).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => changeLanguage(lang)}
              style={[
                styles.langButton,
                i18n.language === lang && styles.langButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.langButtonText,
                  i18n.language === lang && styles.langButtonTextActive,
                ]}
              >
                {lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.body}>
          <Image
            source={require("../../src/auth/logoseemann.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {step === "email" ? (
            <>
              {err ? <Text style={styles.errorText}>{err}</Text> : null}

              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="go"
                enablesReturnKeyAutomatically
                placeholder={t("home.login.emailPlaceholder", {
                  defaultValue: "email@seemanngroup.com",
                })}
                placeholderTextColor={brand.mutedLight}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={goToPassword}
                style={[styles.input, focused && styles.inputFocused]}
              />

              <Pressable
                onPress={goToPassword}
                disabled={!emailReady}
                style={[
                  styles.primaryButton,
                  !emailReady && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {t("home.login.continueButton", { defaultValue: "Continuar" })}
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
              <Text style={styles.title}>
                {t("home.login.passwordStepTitle", {
                  defaultValue: "Ingresa tu clave",
                })}
              </Text>
              <Text style={styles.emailHint} numberOfLines={1}>
                {email.trim()}
              </Text>

              {err ? <Text style={styles.errorText}>{err}</Text> : null}

              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                enablesReturnKeyAutomatically
                placeholder={t("home.login.passwordPlaceholder")}
                placeholderTextColor={brand.mutedLight}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={tryLogin}
                style={[styles.input, focused && styles.inputFocused]}
              />

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
                style={[
                  styles.primaryButton,
                  submitDisabled && styles.primaryButtonDisabled,
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
      </KeyboardAvoidingView>

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
    backgroundColor: "#ffffff",
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: brand.navy,
    marginTop: -2,
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
  langButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: brand.primary,
  },
  langButtonText: {
    fontSize: 12,
    color: brand.mutedLight,
    fontFamily: fonts.medium,
  },
  langButtonTextActive: {
    color: brand.primary,
    fontFamily: fonts.semiBold,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    paddingBottom: 48,
  },
  logo: {
    width: 180,
    height: 52,
    alignSelf: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: brand.navy,
    textAlign: "center",
    marginBottom: 28,
    letterSpacing: -0.3,
  },
  emailHint: {
    fontSize: 14,
    color: brand.muted,
    textAlign: "center",
    marginBottom: 28,
    fontFamily: fonts.medium,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#dfe3e8",
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: brand.ink,
    fontFamily: fonts.regular,
    marginBottom: 20,
  },
  inputFocused: {
    borderColor: brand.primary,
  },
  primaryButton: {
    backgroundColor: brand.primary,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#ffc9a8",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  recoverLink: {
    marginTop: 22,
    alignSelf: "center",
  },
  recoverLinkText: {
    fontSize: 14,
    color: brand.navy,
    fontFamily: fonts.medium,
    textAlign: "center",
    textDecorationLine: "underline",
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
    paddingTop: 24,
    paddingBottom: 20,
    zIndex: 1,
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
  },
  modalButton: {
    backgroundColor: brand.primary,
    borderRadius: radii.pill,
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
    backgroundColor: "#fff",
  },
});
