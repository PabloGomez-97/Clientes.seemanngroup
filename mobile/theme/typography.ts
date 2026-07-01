export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;

export function applyGlobalFonts() {
  const { Text, TextInput } = require("react-native") as typeof import("react-native");

  const textDefaults = (Text as unknown as { defaultProps?: { style?: object } })
    .defaultProps;
  (Text as unknown as { defaultProps?: { style?: object } }).defaultProps = {
    ...textDefaults,
    style: [{ fontFamily: fonts.regular }, textDefaults?.style],
  };

  const inputDefaults = (
    TextInput as unknown as { defaultProps?: { style?: object } }
  ).defaultProps;
  (TextInput as unknown as { defaultProps?: { style?: object } }).defaultProps =
    {
      ...inputDefaults,
      style: [{ fontFamily: fonts.regular }, inputDefaults?.style],
    };
}
