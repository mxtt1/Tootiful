import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import authService from "../services/authService.js";

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email = "" } = useLocalSearchParams();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const timerRef = useRef(null);

  // Start cooldown on mount
  useEffect(() => {
    startCooldown();
    return () => stopCooldown();
  }, []);

  const startCooldown = () => {
    stopCooldown();
    setSecondsLeft(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stopCooldown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const canResend = secondsLeft === 0;

  const resend = async () => {
    if (!canResend) return;
    try {
      await authService.resendVerification(String(email));
      alert("If your account is unverified, we've sent a new email.");
      startCooldown(); // restart cooldown after resend
    } catch (e) {
      alert("Failed to resend. Try again later.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We’ve sent a verification link to{" "}
        <Text style={{ fontWeight: "600" }}>{email}</Text>. Click the link to
        verify, then return to login.
      </Text>

      <TouchableOpacity
        style={styles.primary}
        onPress={() => router.replace("/login")}
      >
        <Text style={styles.primaryText}>Back to Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.secondary,
          !canResend && { opacity: 0.5, borderColor: "#eee" },
        ]}
        onPress={resend}
        disabled={!canResend}
      >
        <Text style={styles.secondaryText}>
          {canResend
            ? "Resend verification email"
            : `Resend available in ${secondsLeft}s`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22 },
  primary: {
    backgroundColor: "black",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "600" },
  secondary: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  secondaryText: { color: "black", fontWeight: "600" },
});
