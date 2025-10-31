import { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/Feather";
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
  const [showPassword, setShowPassword] = useState(false);
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

      if (
        error?.response?.code === "ACCOUNT_INACTIVE" ||
        error?.code === "ACCOUNT_INACTIVE"
      ) {
        router.replace({ pathname: "/verify_email", params: { email } });
        return;
      }

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
      {/* Education asset above logo - centered */}
      <Image
        source={require("../assets/images/Education Asset 4.png")}
        style={styles.topCenterAsset}
        resizeMode="contain"
      />

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

      <View style={{ position: "relative" }}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.showPasswordIcon}
          onPress={() => setShowPassword((v) => !v)}
        >
          <Icon
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </View>

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
        Don't have an account?{" "}
        <Link href="/register" style={styles.signupLink}>
          Sign Up
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  showPasswordIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
    zIndex: 10,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingTop: -20,
    marginTop: -40,
  },
  topCenterAsset: {
    alignSelf: "center",
    width: 270,
    height: 230,
    marginBottom: -90,
    zIndex: 1,
  },
  logo: {
    width: 270,
    height: 270,
    alignSelf: "center",
    marginBottom: -70,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6a5acd",
    marginBottom: 15,
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
