import React from "react";
import { StyleProp, TextInput, TextStyle } from "react-native";

type AmountInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
};

const normalizeAmount = (value: string): string => {
  const withDot = value.replace(/,/g, ".");
  const onlyValidChars = withDot.replace(/[^0-9.]/g, "");

  const firstDotIndex = onlyValidChars.indexOf(".");
  if (firstDotIndex === -1) {
    return onlyValidChars;
  }

  return (
    onlyValidChars.slice(0, firstDotIndex + 1) +
    onlyValidChars.slice(firstDotIndex + 1).replace(/\./g, "")
  );
};

export default function AmountInput({
  value,
  onChangeText,
  placeholder = "Amount",
  placeholderTextColor = "#999",
  style,
}: AmountInputProps) {
  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="decimal-pad"
      value={value}
      onChangeText={(text) => onChangeText(normalizeAmount(text))}
    />
  );
}
