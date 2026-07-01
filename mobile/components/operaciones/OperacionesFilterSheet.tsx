import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  countActiveAirOceanFilters,
  countActiveGroundFilters,
  type AirOceanOperacionesFilters,
  type GroundOperacionesFilters,
  type OperacionesTab,
} from "../../../src/services/operacionesFiltersLogic";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type OperacionesFilterSheetProps = {
  visible: boolean;
  tab: OperacionesTab;
  airOceanFilters: AirOceanOperacionesFilters;
  groundFilters: GroundOperacionesFilters;
  onClose: () => void;
  onApplyAirOcean: (filters: AirOceanOperacionesFilters) => void;
  onApplyGround: (filters: GroundOperacionesFilters) => void;
  onClear: () => void;
};

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={brand.mutedLight}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

export default function OperacionesFilterSheet({
  visible,
  tab,
  airOceanFilters,
  groundFilters,
  onClose,
  onApplyAirOcean,
  onApplyGround,
  onClear,
}: OperacionesFilterSheetProps) {
  const [draftAirOcean, setDraftAirOcean] =
    useState<AirOceanOperacionesFilters>(airOceanFilters);
  const [draftGround, setDraftGround] =
    useState<GroundOperacionesFilters>(groundFilters);

  useEffect(() => {
    if (!visible) return;
    setDraftAirOcean(airOceanFilters);
    setDraftGround(groundFilters);
  }, [airOceanFilters, groundFilters, visible]);

  const activeCount =
    tab === "ground"
      ? countActiveGroundFilters(draftGround)
      : countActiveAirOceanFilters(draftAirOcean);

  const apply = () => {
    if (tab === "ground") {
      onApplyGround(draftGround);
    } else {
      onApplyAirOcean(draftAirOcean);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtros</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={brand.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {tab === "ground" ? (
              <>
                <FilterInput
                  label="Número"
                  value={draftGround.number ?? ""}
                  onChangeText={(number) =>
                    setDraftGround((prev) => ({ ...prev, number }))
                  }
                />
                <FilterInput
                  label="Origen"
                  value={draftGround.origin ?? ""}
                  onChangeText={(origin) =>
                    setDraftGround((prev) => ({ ...prev, origin }))
                  }
                />
                <FilterInput
                  label="Destino"
                  value={draftGround.destination ?? ""}
                  onChangeText={(destination) =>
                    setDraftGround((prev) => ({ ...prev, destination }))
                  }
                />
                <FilterInput
                  label="Fecha salida (AAAA-MM-DD)"
                  value={draftGround.departureDate ?? ""}
                  onChangeText={(departureDate) =>
                    setDraftGround((prev) => ({ ...prev, departureDate }))
                  }
                />
                <FilterInput
                  label="Transportista"
                  value={draftGround.carrier ?? ""}
                  onChangeText={(carrier) =>
                    setDraftGround((prev) => ({ ...prev, carrier }))
                  }
                />
                <FilterInput
                  label="Tipo / clase"
                  value={draftGround.type ?? ""}
                  onChangeText={(type) =>
                    setDraftGround((prev) => ({ ...prev, type }))
                  }
                />
                <FilterInput
                  label="Piezas"
                  value={draftGround.pieces ?? ""}
                  onChangeText={(pieces) =>
                    setDraftGround((prev) => ({ ...prev, pieces }))
                  }
                />
              </>
            ) : (
              <>
                <FilterInput
                  label="Número SOG / HBLI"
                  value={draftAirOcean.number ?? ""}
                  onChangeText={(number) =>
                    setDraftAirOcean((prev) => ({ ...prev, number }))
                  }
                />
                <FilterInput
                  label="Guía / Waybill"
                  value={draftAirOcean.waybill ?? ""}
                  onChangeText={(waybill) =>
                    setDraftAirOcean((prev) => ({ ...prev, waybill }))
                  }
                />
                <FilterInput
                  label="Referencia cliente"
                  value={draftAirOcean.clientReference ?? ""}
                  onChangeText={(clientReference) =>
                    setDraftAirOcean((prev) => ({ ...prev, clientReference }))
                  }
                />
                <FilterInput
                  label="Fecha salida (AAAA-MM-DD)"
                  value={draftAirOcean.departureDate ?? ""}
                  onChangeText={(departureDate) =>
                    setDraftAirOcean((prev) => ({ ...prev, departureDate }))
                  }
                />
                <FilterInput
                  label="Fecha llegada (AAAA-MM-DD)"
                  value={draftAirOcean.arrivalDate ?? ""}
                  onChangeText={(arrivalDate) =>
                    setDraftAirOcean((prev) => ({ ...prev, arrivalDate }))
                  }
                />
                <FilterInput
                  label="Transportista"
                  value={draftAirOcean.carrier ?? ""}
                  onChangeText={(carrier) =>
                    setDraftAirOcean((prev) => ({ ...prev, carrier }))
                  }
                />
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={apply}>
              <Text style={styles.applyButtonText}>
                Aplicar{activeCount > 0 ? ` (${activeCount})` : ""}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: brand.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: brand.ink,
    backgroundColor: brand.canvasAlt,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
  },
  clearButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  clearButtonText: {
    color: brand.inkSecondary,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  applyButtonText: {
    color: "#fff",
    fontFamily: fonts.semiBold,
  },
});
