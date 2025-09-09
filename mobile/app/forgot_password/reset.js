import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView,
  ScrollView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { resetPassword } from "../../services/passwordResetService";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react-native";

export default function ResetPasswordScreen() {
  const { email, token } = useLocalSearchParams();
  const emailLc = String(email || "").toLowerCase();
  const resetToken = decodeURIComponent(String(token || ""));
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const router = useRouter();

  const getStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: "Weak", color: "red" };
    if (score === 2) return { label: "Medium", color: "orange" };
    return { label: "Strong", color: "green" };
  };
  const strength = pw1 ? getStrength(pw1) : null;

  const criteria = [
    { label: "At least 8 characters", valid: pw1.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(pw1) },
    { label: "One lowercase letter", valid: /[a-z]/.test(pw1) },
    { label: "One number", valid: /[0-9]/.test(pw1) },
    { label: "One special character (!@#$%^&*)", valid: /[^A-Za-z0-9]/.test(pw1) },
  ];

  const onSubmit = async () => {
    if (loading) return;
    setErr(null);

    if (!resetToken) return setErr("Missing reset token. Please verify the code again.");
    if (!criteria.every((c) => c.valid)) return setErr("Password does not meet the required criteria.");
    if (pw1 !== pw2) return setErr("Passwords do not match.");

    try {
      setLoading(true);
      await resetPassword(emailLc, resetToken, pw1);
      router.replace({ pathname: "/forgot_password/success", params: { email: emailLc } });
    } catch (e) {
      setErr(e.message || "Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Image
            source={require("../../assets/images/tooty.png")}
            style={{ width: 160, height: 80, alignSelf: "center", marginBottom: 32 }}
            resizeMode="contain"
          />

          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: "#5C49D8", fontSize: 16 }}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>For {emailLc}</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={pw1}
              onChangeText={setPw1}
              placeholder="New password"
              secureTextEntry={!showPw1}
              style={[styles.input, { flex: 1 }]}
              returnKeyType="next"
            />
            <Pressable onPress={() => setShowPw1(!showPw1)} style={styles.iconBtn}>
              {showPw1 ? <EyeOff size={20} color="#5C49D8" /> : <Eye size={20} color="#5C49D8" />}
            </Pressable>
          </View>

          {strength && (
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, { backgroundColor: strength.color }]} />
              <Text style={{ color: strength.color, fontWeight: "600" }}>{strength.label}</Text>
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            {criteria.map((c, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
                {c.valid ? <CheckCircle2 size={16} color="green" /> : <Circle size={16} color="#aaa" />}
                <Text style={{ marginLeft: 6, color: c.valid ? "green" : "#555" }}>{c.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={pw2}
              onChangeText={setPw2}
              placeholder="Confirm new password"
              secureTextEntry={!showPw2}
              style={[styles.input, { flex: 1 }]}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            <Pressable onPress={() => setShowPw2(!showPw2)} style={styles.iconBtn}>
              {showPw2 ? <EyeOff size={20} color="#5C49D8" /> : <Eye size={20} color="#5C49D8" />}
            </Pressable>
          </View>

          {err ? <Text style={styles.error}>{err}</Text> : null}

          <Pressable
            onPress={onSubmit}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Saving..." : "Update password"}</Text>
          </Pressable>

          {/* tiny spacer so the button clears the keyboard comfortably */}
          <View style={{ height: 12 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // lets the screen center when keyboard is hidden, but become scrollable when shown
  // fix keyboard blocking issue
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  container: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#5C49D8" },
  subtitle: { color: "#444", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#FAFAFA" },
  iconBtn: { marginLeft: 8, padding: 6 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  strengthBar: { width: 60, height: 6, borderRadius: 3 },
  button: { backgroundColor: "#00C4C4", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  error: { color: "#B00020", marginTop: 4 },
  backBtn: { position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 },
});
