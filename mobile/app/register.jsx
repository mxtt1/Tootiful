import { useState } from "react";
import Icon from "react-native-vector-icons/Feather";
import studentService from "../services/studentService.js";
import tutorService from "../services/tutorService.js";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const router = useRouter();

    // Dropdown picker state
    const [roleOpen, setRoleOpen] = useState(false);
    const [roleValue, setRoleValue] = useState("Student");
    const [roleItems, setRoleItems] = useState([
        { label: "Student", value: "Student" },
        { label: "Tutor", value: "Tutor" },
    ]);

    const validateFields = () => {
        const newErrors = {};

        if (!firstName.trim()) newErrors.firstName = "First name is required";
        else if (firstName.length < 2) newErrors.firstName = "Too short";

        if (!lastName.trim()) newErrors.lastName = "Last name is required";
        else if (lastName.length < 2) newErrors.lastName = "Too short";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) newErrors.email = "Email is required";
        else if (!emailRegex.test(email)) newErrors.email = "Invalid email";

        if (!password) newErrors.password = "Password is required";
        else if (password.length < 6)
            newErrors.password = "Password must be ≥ 6 chars";

        if (confirmPassword !== password)
            newErrors.confirmPassword = "Passwords do not match";

        return newErrors;
    };

    const handleRegister = async () => {
        const validationErrors = validateFields();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});

        try {
            const payload = { firstName, lastName, email, password };
            let data;
            if (roleValue === "Student") {
                data = await studentService.createStudent(payload);
            } else {
                data = await tutorService.createTutor(payload);
            }

            console.log("Registration successful:", data);
            // router.replace("/login");
            router.replace({ pathname: "/verify_email", params: { email } });
        } catch (error) {
            console.error("Registration error:", error);

            // Backend Sequelize errors
            if (error.data?.errors && Array.isArray(error.data.errors)) {
                setErrors({ backend: error.data.errors.join("\n") });
            } else {
                setErrors({ backend: error.message || "Something went wrong" });
            }
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
            {errors.firstName && <Text style={styles.error}>{errors.firstName}</Text>}

            {/* Last Name */}
            <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
            />
            {errors.lastName && <Text style={styles.error}>{errors.lastName}</Text>}

            {/* Email */}
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
            />
            {errors.email && <Text style={styles.error}>{errors.email}</Text>}

            {/* Password */}
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
            {errors.password && <Text style={styles.error}>{errors.password}</Text>}

            {/* Confirm Password */}
            <View style={{ position: "relative" }}>
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                    style={styles.showPasswordIcon}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                >
                    <Icon
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={22}
                        color="#888"
                    />
                </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
                <Text style={styles.error}>{errors.confirmPassword}</Text>
            )}

            {/* Role Dropdown */}
            <View style={[styles.pickerContainer, { zIndex: roleOpen ? 1000 : 1, marginBottom: 20 }]}>
                <DropDownPicker
                    open={roleOpen}
                    value={roleValue}
                    items={roleItems}
                    setOpen={setRoleOpen}
                    setValue={setRoleValue}
                    setItems={setRoleItems}
                    placeholder="Select Role"
                    style={styles.picker}
                    dropDownContainerStyle={styles.dropdown}
                />
            </View>

            {/* Backend errors */}
            {errors.backend && (
                <Text style={[styles.error, { textAlign: "center" }]}>
                    {errors.backend}
                </Text>
            )}

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
    container: { 
        flex: 1, 
        padding: 24, 
        justifyContent: "center", 
        backgroundColor: "#fff" 
    },
    logo: { 
        width: 120, 
        height: 120, 
        alignSelf: "center", 
        marginBottom: 20 
    },
    title: { 
        fontSize: 22, 
        fontWeight: "bold", 
        color: "#6a5acd", 
        marginBottom: 20,
        textAlign: "center"
    },
    input: {
        borderWidth: 0,
        borderRadius: 12,
        paddingHorizontal: 20,
        height: 50,
        fontSize: 14,
        marginBottom: 6,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
    },
    inputError: {
        borderWidth: 1,
        borderColor: "red",
    },
    pickerContainer: {
        justifyContent: "center",
        position: "relative",
    },
    picker: {
        height: 50,
        width: "100%",
        color: "#374151",
        backgroundColor: "#fff",
        borderWidth: 0,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
    },
    dropdown: {
        borderWidth: 0,
        borderRadius: 12,
        marginTop: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        backgroundColor: "#fff",
    },
    button: {
        backgroundColor: "#6155F5",
        borderRadius: 15,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        marginTop: 10,
    },
    buttonText: { 
        color: "#fff", 
        fontSize: 16, 
        fontWeight: "700" 
    },
    back: {
        textAlign: "center",
        fontSize: 14,
        color: "#000",
        textDecorationLine: "underline",
    },
    error: { 
        color: "red", 
        fontSize: 13, 
        marginBottom: 8,
        marginLeft: 5
    },
    showPasswordIcon: {
        position: "absolute",
        right: 18,
        top: 14,
        padding: 4,
        zIndex: 10,
    },
});