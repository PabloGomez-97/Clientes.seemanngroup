import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { formatValidUntilDisplay } from "../../../src/components/quotes/Handlers/handlerFechas";
import { useAuth } from "../../auth/AuthContext";
import {
  crearOperacion,
  listarProveedores,
  type CrearOperacionPayload,
  type Proveedor,
} from "../../services/crearOperacionApi";
import {
  DOCUMENT_FORMATS_HINT,
  DOCUMENT_MAX_FILE_SIZE,
  isAllowedDocumentUpload,
  mimeFromDocumentFileName,
  resolveDocumentMime,
} from "@/utils/documentFileTypes";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type DocTipo = "Orden de compra" | "Invoice" | "Packing List";

const DOC_TIPOS: DocTipo[] = ["Orden de compra", "Invoice", "Packing List"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PickedDoc = {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
};

export type GenerateOperationModalProps = {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  quoteNumber: string;
  quoteId?: string | null;
  tipoServicio: "AIR" | "FCL" | "LCL";
  emailContext?: CrearOperacionPayload["emailContext"];
  validUntil?: string | null;
  ownerUsername?: string;
};

interface FormState {
  proveedorIdSeleccionado: string;
  nombreEmpresa: string;
  nombreContacto: string;
  email: string;
  telefono: string;
}

const emptyForm: FormState = {
  proveedorIdSeleccionado: "",
  nombreEmpresa: "",
  nombreContacto: "",
  email: "",
  telefono: "",
};

type Step = "confirm" | "form" | "success";

function resolvePickedMime(name: string, mimeType?: string): string {
  return (
    resolveDocumentMime(name, mimeType) ||
    mimeFromDocumentFileName(name) ||
    "application/octet-stream"
  );
}

export default function GenerateOperationModal({
  show,
  onClose,
  onSuccess,
  quoteNumber,
  quoteId,
  tipoServicio,
  emailContext,
  validUntil,
  ownerUsername,
}: GenerateOperationModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [files, setFiles] = useState<Partial<Record<DocTipo, PickedDoc>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validUntilDisplay = useMemo(() => {
    if (!validUntil) return null;
    const display = formatValidUntilDisplay(validUntil);
    if (!display || display === "—") return String(validUntil).trim() || null;
    return display.replace(/-/g, "/");
  }, [validUntil]);

  useEffect(() => {
    if (show) {
      setStep("confirm");
      setForm(emptyForm);
      setFiles({});
      setError(null);
      setTouched(false);
    }
  }, [show]);

  useEffect(() => {
    if (step !== "form" || !token) return;
    let cancelled = false;
    setLoadingProveedores(true);
    listarProveedores(token, ownerUsername)
      .then((data) => {
        if (!cancelled) setProveedores(data);
      })
      .catch(() => {
        if (!cancelled) setProveedores([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProveedores(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, token, ownerUsername]);

  const handleSelectProveedor = (id: string) => {
    if (!id) {
      setForm({ ...emptyForm, proveedorIdSeleccionado: "" });
      return;
    }
    const p = proveedores.find((x) => x.id === id);
    if (!p) return;
    setForm({
      proveedorIdSeleccionado: id,
      nombreEmpresa: p.nombreEmpresa,
      nombreContacto: p.nombreContacto,
      email: p.email,
      telefono: p.telefono,
    });
  };

  const pickFile = async (tipo: DocTipo) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!isAllowedDocumentUpload(asset.name, asset.mimeType)) {
        setError(
          `"${asset.name}" no es un formato válido. ${DOCUMENT_FORMATS_HINT}`,
        );
        return;
      }
      if (asset.size != null && asset.size > DOCUMENT_MAX_FILE_SIZE) {
        setError(`"${asset.name}" excede el tamaño máximo de 15MB.`);
        return;
      }
      setError(null);
      setFiles((prev) => ({
        ...prev,
        [tipo]: {
          name: asset.name,
          uri: asset.uri,
          mimeType: resolvePickedMime(asset.name, asset.mimeType),
          size: asset.size,
        },
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo seleccionar el archivo",
      );
    }
  };

  const clearFile = (tipo: DocTipo) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
  };

  const formErrors = useMemo(() => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombreEmpresa.trim()) errs.nombreEmpresa = "Requerido";
    if (!form.nombreContacto.trim()) errs.nombreContacto = "Requerido";
    if (!form.email.trim()) errs.email = "Requerido";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "Email inválido";
    if (!form.telefono.trim()) errs.telefono = "Requerido";
    return errs;
  }, [form]);

  const canSubmit = Object.keys(formErrors).length === 0 && !submitting;

  const handleSubmit = async () => {
    setTouched(true);
    if (!token) {
      setError("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }
    if (!canSubmit) {
      setError("Completa todos los campos del proveedor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const tiposConArchivo = DOC_TIPOS.filter((tipo) => files[tipo]);
      const documentos = await Promise.all(
        tiposConArchivo.map(async (tipo) => {
          const file = files[tipo]!;
          const raw = await FileSystem.readAsStringAsync(file.uri, {
            encoding: "base64",
          });
          const mime = resolvePickedMime(file.name, file.mimeType);
          return {
            tipo,
            nombreArchivo: file.name,
            contenidoBase64: `data:${mime};base64,${raw}`,
          };
        }),
      );

      await crearOperacion(token, {
        quoteNumber,
        quoteId: quoteId ?? null,
        tipoServicio,
        proveedor: {
          nombreEmpresa: form.nombreEmpresa.trim(),
          nombreContacto: form.nombreContacto.trim(),
          email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim(),
        },
        documentos,
        emailContext,
        ownerUsername,
      });

      setStep("success");
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear la operación",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={show}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, step === "form" && styles.sheetLg]}>
          <View style={styles.handle} />

          {step === "confirm" ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    ¿Convertir esta cotización en operación?
                  </Text>
                  <Text style={styles.sub}>
                    Cotización {quoteNumber} · {tipoServicio}
                  </Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                  <Ionicons name="close" size={20} color={brand.ink} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.para}>
                  Generar una operación significa que aceptas avanzar con esta
                  tarifa y compartirás los datos del proveedor junto con los
                  documentos de referencia si los tienes disponibles (orden de
                  compra, invoice y packing list).
                </Text>
                <Text style={styles.para}>
                  Si no estás listo, puedes cerrar este diálogo y la cotización
                  quedará disponible para revisarla más tarde sin generar la
                  operación.
                </Text>
                <Text style={styles.para}>
                  La tarifa seleccionada tiene validez hasta el{" "}
                  <Text style={styles.bold}>
                    {validUntilDisplay ?? "fecha indicada en la cotización"}
                  </Text>
                  . Si la fecha de validez se encuentra próxima a vencer, los
                  valores podrían variar. Recomendamos solicitar la operación lo
                  antes posible.
                </Text>
              </ScrollView>
              <View style={styles.footer}>
                <Pressable style={styles.secondaryBtn} onPress={onClose}>
                  <Text style={styles.secondaryBtnText}>
                    Solo dejar la cotización
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => setStep("form")}
                >
                  <Text style={styles.primaryBtnText}>
                    Sí, generar operación
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "form" ? (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Datos de la operación</Text>
                  <Text style={styles.sub}>
                    Cotización {quoteNumber} · {tipoServicio}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={8}
                  disabled={submitting}
                >
                  <Ionicons name="close" size={20} color={brand.ink} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {error ? <Text style={styles.errorBox}>{error}</Text> : null}

                <Text style={styles.sectionTitle}>Proveedor</Text>

                {loadingProveedores ? (
                  <ActivityIndicator color={brand.navy} style={{ marginBottom: 8 }} />
                ) : null}

                {proveedores.length > 0 ? (
                  <View style={styles.providerList}>
                    <Text style={styles.label}>Proveedor guardado</Text>
                    <Pressable
                      style={[
                        styles.providerChip,
                        !form.proveedorIdSeleccionado && styles.providerChipOn,
                      ]}
                      onPress={() => handleSelectProveedor("")}
                      disabled={submitting}
                    >
                      <Text
                        style={[
                          styles.providerChipText,
                          !form.proveedorIdSeleccionado &&
                            styles.providerChipTextOn,
                        ]}
                      >
                        — Nuevo proveedor —
                      </Text>
                    </Pressable>
                    {proveedores.map((p) => {
                      const on = form.proveedorIdSeleccionado === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          style={[
                            styles.providerChip,
                            on && styles.providerChipOn,
                          ]}
                          onPress={() => handleSelectProveedor(p.id || "")}
                          disabled={submitting}
                        >
                          <Text
                            style={[
                              styles.providerChipText,
                              on && styles.providerChipTextOn,
                            ]}
                          >
                            {p.nombreEmpresa}
                          </Text>
                        </Pressable>
                      );
                    })}
                    <Text style={styles.hint}>
                      Selecciona uno guardado o deja en blanco para escribir un
                      nuevo proveedor.
                    </Text>
                  </View>
                ) : null}

                <Field
                  label="Nombre de la empresa (PROVEEDOR)"
                  value={form.nombreEmpresa}
                  onChange={(v) => setForm({ ...form, nombreEmpresa: v })}
                  error={touched ? formErrors.nombreEmpresa : undefined}
                  disabled={submitting}
                />
                <Field
                  label="Nombre del contacto (PROVEEDOR)"
                  value={form.nombreContacto}
                  onChange={(v) => setForm({ ...form, nombreContacto: v })}
                  error={touched ? formErrors.nombreContacto : undefined}
                  disabled={submitting}
                />
                <Field
                  label="Email (PROVEEDOR)"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  error={touched ? formErrors.email : undefined}
                  disabled={submitting}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field
                  label="Teléfono (PROVEEDOR)"
                  value={form.telefono}
                  onChange={(v) => setForm({ ...form, telefono: v })}
                  error={touched ? formErrors.telefono : undefined}
                  disabled={submitting}
                  keyboardType="phone-pad"
                />

                <Text style={styles.sectionTitle}>Documentos de referencia</Text>
                <Text style={styles.hint}>
                  Puedes adjuntar uno, varios o ninguno. Formatos:{" "}
                  {DOCUMENT_FORMATS_HINT}
                </Text>

                {DOC_TIPOS.map((tipo) => {
                  const file = files[tipo];
                  return (
                    <View key={tipo} style={styles.docCard}>
                      <View style={styles.docHead}>
                        <Text style={styles.docName}>{tipo}</Text>
                        <Text style={styles.docOptional}>Opcional</Text>
                      </View>
                      <View style={styles.docRow}>
                        <Pressable
                          style={styles.docPick}
                          onPress={() => void pickFile(tipo)}
                          disabled={submitting}
                        >
                          <Text style={styles.docPickText}>
                            {file ? "Cambiar archivo" : "Seleccionar archivo"}
                          </Text>
                        </Pressable>
                        <Text
                          style={[
                            styles.docFileName,
                            file && styles.docFileNameOk,
                          ]}
                          numberOfLines={1}
                        >
                          {file ? file.name : "Sin archivo"}
                        </Text>
                        {file ? (
                          <Pressable
                            onPress={() => clearFile(tipo)}
                            disabled={submitting}
                            hitSlop={8}
                          >
                            <Text style={styles.docRemove}>Quitar</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.footer}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryBtn,
                    (submitting || !canSubmit) && styles.primaryDisabled,
                  ]}
                  onPress={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Generar operación
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}

          {step === "success" ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Operación generada</Text>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                  <Ionicons name="close" size={20} color={brand.ink} />
                </Pressable>
              </View>
              <View style={styles.body}>
                <View style={styles.successBox}>
                  <Text style={styles.successText}>
                    Tu operación para la cotización {quoteNumber} ha sido creada
                    correctamente y notificada a tu ejecutivo asignado.
                  </Text>
                </View>
                <Text style={styles.para}>
                  Si adjuntaste documentos, quedaron asociados a la cotización y
                  disponibles en la sección Documentos del portal.
                </Text>
              </View>
              <View style={styles.footer}>
                <Pressable style={styles.primaryBtn} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Cerrar</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  disabled,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        <Text style={styles.required}> *</Text>
      </Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 17, 22, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: brand.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "92%",
    paddingBottom: 12,
  },
  sheetLg: {
    maxHeight: "94%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.border,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 10,
  },
  para: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: brand.inkSecondary,
    lineHeight: 20,
  },
  bold: {
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 2,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    textAlign: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: brand.inkSecondary,
    marginBottom: 4,
  },
  required: {
    color: brand.primary,
  },
  field: { gap: 2 },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: brand.ink,
    backgroundColor: brand.surface,
  },
  inputError: {
    borderColor: "#b42318",
  },
  fieldError: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#b42318",
  },
  hint: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: brand.muted,
    marginBottom: 4,
  },
  providerList: { gap: 6, marginBottom: 4 },
  providerChip: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  providerChipOn: {
    backgroundColor: brand.navy,
    borderColor: brand.navy,
  },
  providerChipText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  providerChipTextOn: {
    color: "#fff",
  },
  docCard: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
  },
  docHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  docName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  docOptional: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: brand.muted,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docPick: {
    backgroundColor: brand.canvasAlt,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  docPickText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  docFileName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  docFileNameOk: {
    color: brand.inkSecondary,
  },
  docRemove: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "#b42318",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#b42318",
  },
  successBox: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: radii.md,
    padding: 12,
  },
  successText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#047857",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
  },
  primaryBtn: {
    backgroundColor: brand.navy,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
  secondaryBtn: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: brand.navy,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },
});
