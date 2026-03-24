import React from "react";
import { StyleProp, TextInput, TextStyle } from "react-native";

type DescriptionInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
};

const normalizeDescription = (value: string): string =>
  value.replace(/\s+/g, " ");

export default function DescriptionInput({
  value,
  onChangeText,
  placeholder = "Description",
  placeholderTextColor = "#999",
  style,
}: DescriptionInputProps) {
  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      value={String(value ?? "")}
      onChangeText={(text) => onChangeText(normalizeDescription(text))}
    />
  );
}
