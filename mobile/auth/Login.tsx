import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import {
  LOGIN_BG,
  LOGIN_BORDER,
  LOGIN_DARK,
  LOGIN_MUTED,
  LOGIN_PRIMARY,
} from "../../src/auth/loginTheme";

const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export default function Login() {
  const { login, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );
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

  const submitDisabled =
    loading || !email.trim() || !password || (captchaRequired && !turnstileToken);

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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandPanel}>
          <Image
            source={require("../../src/auth/logoseemann.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.accent} />
          <Text style={styles.brandTitle}>{t("home.login.title")}</Text>
          <Text style={styles.brandSubtitle}>{t("home.login.subtitle")}</Text>
        </View>

        <View style={styles.formPanel}>
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

          <Text style={styles.formTitle}>{t("home.login.loginButton")}</Text>
          <Text style={styles.formSubtitle}>{t("home.login.subtitle")}</Text>

          {err ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{err}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t("home.login.emailLabel")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t("home.login.emailPlaceholder")}
            placeholderTextColor="#aaa"
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === "email" && styles.inputFocused,
            ]}
          />

          <Text style={styles.label}>{t("home.login.passwordLabel")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            placeholder={t("home.login.passwordPlaceholder")}
            placeholderTextColor="#aaa"
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === "password" && styles.inputFocused,
            ]}
          />

          {captchaRequired && turnstileHtml ? (
            <View style={styles.captchaBox}>
              <Text style={styles.label}>{t("home.login.captchaLabel")}</Text>
              <WebView
                key={turnstileKeyRef.current}
                originWhitelist={["*"]}
                source={{ html: turnstileHtml }}
                onMessage={(event) => setTurnstileToken(event.nativeEvent.data)}
                style={styles.captchaWebView}
              />
            </View>
          ) : null}

          <Pressable
            onPress={() => void onSubmit()}
            disabled={submitDisabled}
            style={[styles.submitButton, submitDisabled && styles.submitDisabled]}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitText}>{t("home.login.loggingIn")}</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>{t("home.login.loginButton")}</Text>
            )}
          </Pressable>

          <Text style={styles.footer}>
            {t("home.login.footer", {
              defaultValue: `© ${new Date().getFullYear()} Seemann Group`,
            })}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LOGIN_BG,
  },
  scrollContent: {
    flexGrow: 1,
  },
  brandPanel: {
    backgroundColor: LOGIN_DARK,
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 36,
  },
  logo: {
    width: 180,
    height: 56,
    marginBottom: 24,
  },
  accent: {
    width: 32,
    height: 3,
    backgroundColor: LOGIN_PRIMARY,
    marginBottom: 16,
  },
  brandTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 8,
  },
  brandSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    lineHeight: 22,
  },
  formPanel: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 28,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  langButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#e5e5e5",
  },
  langButtonText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
  },
  langButtonTextActive: {
    color: LOGIN_DARK,
    fontWeight: "600",
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: LOGIN_DARK,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: LOGIN_MUTED,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: LOGIN_BORDER,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: LOGIN_DARK,
    marginBottom: 18,
  },
  inputFocused: {
    borderColor: LOGIN_PRIMARY,
  },
  captchaBox: {
    marginBottom: 18,
  },
  captchaWebView: {
    height: 78,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: LOGIN_PRIMARY,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitDisabled: {
    backgroundColor: "#ccc",
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    color: "#aaa",
    fontSize: 12,
  },
});
