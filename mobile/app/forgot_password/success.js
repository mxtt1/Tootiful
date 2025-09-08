// import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SuccessScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/tooty.png")}
        style={{ width: 160, height: 80, alignSelf: "center", marginBottom: 32 }}
        resizeMode="contain"
      />

      <View style={styles.circle}>
        <Text style={styles.check}>✓</Text>
      </View>

      <Text style={styles.title}>Password Reset Successful</Text>
      <Text style={styles.subtitle}>
        Your password for {email} has been updated. You can now log in.
      </Text>

      <Pressable onPress={() => router.replace("/login")} style={styles.button}>
        <Text style={styles.buttonText}>Back to Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  check: { fontSize: 48, color: "white", fontWeight: "bold" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, color: "#333", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#555", textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#00C4C4", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
