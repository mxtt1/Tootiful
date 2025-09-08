import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { requestPasswordReset } from "../../services/passwordResetService";

export default function ForgotPasswordEmailScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const router = useRouter();

  const onSubmit = async () => {
    setErr(null);
    const v = email.trim().toLowerCase();
    if (!v) {
      setErr("Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      await requestPasswordReset(v); // shows mock OTP via alert
      router.push({ pathname: "/forgot_password/verify", params: { email: v } });
    } catch (e) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/tooty.png")}
        style={{ width: 160, height: 80, alignSelf: "center", marginBottom: 32 }}
        resizeMode="contain"
      />

    <Pressable
    onPress={() => router.back()}
    style={{
        position: "absolute",
        top: 50, // adjust for your status bar/header
        left: 20,
        padding: 8,
        zIndex: 10,
    }}
    >
    <Text style={{ color: "#5C49D8", fontSize: 16 }}>← Back</Text>
    </Pressable>

      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>Enter your account email. We’ll send a 6-digit code.</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email address"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      {err ? <Text style={styles.error}>{err}</Text> : null}

      <Pressable onPress={onSubmit} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
        <Text style={styles.buttonText}>{loading ? "Sending..." : "Send code"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxWidth: 420, alignSelf: "center", padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#5C49D8" },
  subtitle: { color: "#444", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: "#00C4C4", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  error: { color: "#B00020" },
});
