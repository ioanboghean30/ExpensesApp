import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

type DateFieldProps = {
  label?: string;
  value: Date;
  onChange: (value: Date) => void;
  locale?: string;
  labelStyle?: StyleProp<TextStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  maximumDate?: Date;
  iosDisplay?: "default" | "spinner" | "compact" | "inline";
  closeOnChange?: boolean;
};

export default function DateField({
  label,
  value,
  onChange,
  locale = "ro-RO",
  labelStyle,
  fieldStyle,
  textStyle,
  maximumDate,
  iosDisplay = "default",
  closeOnChange = true,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: any, pickedDate?: Date) => {
    const shouldClose = Platform.OS === "android" || closeOnChange;
    if (shouldClose) {
      setShowPicker(false);
    }

    if (pickedDate) {
      onChange(pickedDate);
    }
  };

  return (
    <View>
      {label ? <Text style={labelStyle}>{label}</Text> : null}

      <Pressable onPress={() => setShowPicker(true)}>
        <View style={fieldStyle}>
          <Text style={[styles.dateText, textStyle]}>
            {value.toLocaleDateString(locale)}
          </Text>
        </View>
      </Pressable>

      {showPicker && Platform.OS !== "web" ? (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? iosDisplay : "default"}
          onChange={handleChange}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dateText: {
    color: "white",
    fontSize: 16,
  },
});
