import { useState } from "react";
import studentService from '../services/studentService.js';
import tutorService from '../services/tutorService.js';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState("Student");
    const router = useRouter();

    const handleRegister = async () => {
        try {
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                throw new Error('All fields are required');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const payload = {
                firstName,
                lastName,
                email,
                password
            };

            console.log('Registering:', payload);

            let data;
            if (role === "Student") {
                data = await studentService.createStudent(payload);
            } else if (role === "Tutor") {
                data = await tutorService.createTutor(payload);
            }
            
            console.log('Registration successful:', data);
            router.replace("/login");
        } catch (error) {
            console.error("Registration error:", error);
            // Handle error display
        }
    };
    return (
        <View style={styles.container}>
            {/* Logo */}
            <Image
                source={require("../assets/images/tooty.png")}
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.title}>Sign up</Text>

            {/* First Name */}
            <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
            />

            {/* Last Name */}
            <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
            />

            {/* Email */}
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
            />

            {/* Password */}
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            {/* Confirm Password */}
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            {/* Role Dropdown */}
            <View style={styles.pickerWrapper}>
                <Picker
                    selectedValue={role}
                    style={styles.picker}
                    onValueChange={(itemValue) => setRole(itemValue)}
                >
                    <Picker.Item label="Student" value="Student" />
                    <Picker.Item label="Tutor" value="Tutor" />
                </Picker>
            </View>

            {/* Sign Up button */}
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Sign up</Text>
            </TouchableOpacity>

            {/* Back link */}
            <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.back}>Back</Text>
            </TouchableOpacity>
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
    pickerWrapper: {
        borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 20
    },
    picker: { height: 48, width: "100%" },
    button: {
        backgroundColor: "#00c4cc", borderRadius: 8, height: 50,
        justifyContent: "center", alignItems: "center", marginBottom: 20
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    back: { textAlign: "center", fontSize: 14, color: "#000", textDecorationLine: "underline" }
});