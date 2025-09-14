import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Link, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import authService from "../services/authService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Check if user is already logged in on first render
  useEffect(() => {
    checkAndBypassLogin();
  }, []);

  async function checkAndBypassLogin() {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token || token === "null" || token.trim() === "") return;

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 > Date.now()) {
        // Token is valid, route user
        if (decoded.userType === "student") {
          router.replace("/tabs");
        } else if (decoded.userType === "tutor") {
          router.replace("/tutor");
        } else {
          console.warn("Decoded token missing userType:", decoded);
        }
      } else {
        // Token expired, try to refresh
        const refreshed = await authService.autoRefreshToken();
        if (refreshed) {
          // Optionally, re-run this function to route after refresh
          await checkAndBypassLogin();
        }
      }
    } catch (err) {
      console.warn("Token decode or refresh failed:", err);
    }
  }

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert("Error", "Please enter both email and password");
        return;
      }

      setIsLoading(true);
      console.log("Logging in with email: ", email);

      const response = await authService.login(email, password);
      const decoded = jwtDecode(response.accessToken);
      console.log("Login successful:", response);


      // Navigate based on userType from token
      if (decoded.userType === "student") {
        router.replace("/tabs"); // Student dashboard
      } else {
        router.replace("/tutor"); // Tutor dashboard
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.message || "Invalid credentials. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/tooty.png")} // put your logo at mobile/assets/logo.png
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Sign in</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={{ textAlign: "right", marginTop: 2, marginBottom: 20 }}>
        <Link href="/forgot_password" style={{ color: "#666" }}>
          Forget Password?
        </Link>
      </Text>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.signupText}>
        Don’t have an account?{" "}
        <Link href="/register" style={styles.signupLink}>
          Sign Up
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6a5acd",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: { height: 48, width: "100%" },
  forgot: { alignSelf: "flex-end", marginBottom: 20, color: "#999" },
  button: {
    backgroundColor: "#00c4cc",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  signupText: { textAlign: "center", fontSize: 14, color: "#333" },
  signupLink: { fontWeight: "bold", color: "#000" },
});
