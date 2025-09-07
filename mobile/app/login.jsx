import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
} from "react-native";
import { Link, useRouter } from "expo-router";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleLogin = () => {
        // Later: connect to backend API
        console.log("Logging in with:", email, password);
        router.replace("/"); // Navigate to Home after login
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
                placeholder="Email or User Name"
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

            <TouchableOpacity>
                <Text style={styles.forgot}>Forget Password ?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Sign in</Text>
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
    container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#fff" },
    logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 20 },
    title: { fontSize: 22, fontWeight: "bold", color: "#6a5acd", marginBottom: 20 },
    input: {
        borderWidth: 1, borderColor: "#ccc", borderRadius: 8,
        paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12
    },
    forgot: { alignSelf: "flex-end", marginBottom: 20, color: "#999" },
    button: {
        backgroundColor: "#00c4cc", borderRadius: 8, height: 50,
        justifyContent: "center", alignItems: "center", marginBottom: 20
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    signupText: { textAlign: "center", fontSize: 14, color: "#333" },
    signupLink: { fontWeight: "bold", color: "#000" }
});