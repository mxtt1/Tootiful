import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { verifyOtp, resendOtp } from "../../services/passwordResetService";

function CountdownRing({ seconds }) {
  // A simple ring with a spinner + remaining seconds
  return (
    <View style={styles.ringWrap}>
      <ActivityIndicator size="small" />
      <View style={styles.ringNumber}>
        <Text style={styles.ringText}>{seconds}</Text>
      </View>
    </View>
  );
}

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams();
  const emailLc = String(email || "").toLowerCase();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60); // start locked for 60s
  const inputs = useRef([]);
  const router = useRouter();

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleChange = (text, idx) => {
    const char = text.slice(-1).replace(/\D/g, "");
    const next = [...otp];
    next[idx] = char;
    setOtp(next);
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const code = otp.join("");

  const onSubmit = async () => {
    if (loading) return;
    setErr(null);
    if (code.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    try {
      setLoading(true);
      const token = await verifyOtp(emailLc, code);
      router.push({
        pathname: "/forgot_password/reset",
        params: { email: emailLc, token: encodeURIComponent(token) },
      });
    } catch (e) {
      setErr(e.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || loading) return;
    setErr(null);
    try {
      const res = await resendOtp(emailLc);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();

      // If backend returned throttled + retryInMs, set exact cooldown; else default to 60
      const seconds = res?.throttled ? Math.ceil((res.retryInMs || 60000) / 1000) : 60;
      setCooldown(seconds);

      setErr(res?.throttled
        ? `Please wait ${seconds}s before requesting another code.`
        : "A new code was sent. Use the latest one.");
    } catch (e) {
      setErr(e.message || "Could not resend code. Try again.");
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
        style={{ position: "absolute", top: 50, left: 20, padding: 8, zIndex: 10 }}
      >
        <Text style={{ color: "#5C49D8", fontSize: 16 }}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {emailLc}</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(el) => (inputs.current[idx] = el)}
            value={digit}
            onChangeText={(t) => handleChange(t, idx)}
            onKeyPress={(e) => handleKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.otpBox}
          />
        ))}
      </View>

      {err ? <Text style={styles.error}>{err}</Text> : null}

      <Pressable onPress={onSubmit} style={styles.button} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Verifying..." : "Verify code"}</Text>
      </Pressable>

      {/* Resend row with countdown ring */}
      <View style={styles.resendRow}>
        <Pressable onPress={onResend} disabled={cooldown > 0}>
          <Text style={[styles.linkText, cooldown > 0 && { opacity: 0.6 }]}>
            {cooldown > 0 ? "Resend disabled" : "Resend OTP"}
          </Text>
        </Pressable>

        {cooldown > 0 && <CountdownRing seconds={cooldown} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxWidth: 420, alignSelf: "center", padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#5C49D8", textAlign: "center" },
  subtitle: { color: "#444", marginBottom: 8, textAlign: "center" },
  otpContainer: { flexDirection: "row", justifyContent: "space-between", marginVertical: 16 },
  otpBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    width: 48,
    height: 56,
    textAlign: "center",
    fontSize: 22,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  button: { backgroundColor: "#00C4C4", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
  error: { color: "#B00020", textAlign: "center" },

  resendRow: { marginTop: 12, alignItems: "center", justifyContent: "center", gap: 12, flexDirection: "row" },
  linkText: { color: "#5C49D8", fontWeight: "600" },

  // Countdown ring styles
  ringWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ringNumber: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: { fontSize: 12, fontWeight: "700", color: "#333" },
});
