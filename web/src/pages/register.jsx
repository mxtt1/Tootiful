import React, { useState } from "react";
import {
    TextInput,
    PasswordInput,
    Button,
    Title,
    Text,
    Group,
    Stack,
    Anchor,
    Center,
    Box,
    Notification,
    Image,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import tootyLogo from "../assets/tooty.png";
import tutorsImage from "../assets/tutors1.jpg";

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth(); // make sure your AuthProvider exposes register()
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const form = useForm({
        initialValues: {
            name: "",
            email: "",
            password: "",
            phone: "",
        },
        validate: {
            name: (value) => (!value.trim() ? "Name is required" : null),
            email: (value) => {
                if (!value.trim()) return "Email is required";
                if (!/\S+@\S+\.\S+/.test(value)) return "Please enter a valid email";
                return null;
            },
            password: (value) => {
                if (!value) return "Password is required";
                if (value.length < 6) return "Password must be at least 6 characters";
                return null;
            },
            phone: (value) =>
                !value.trim() ? "Phone number is required" : null,
        },
    });

    const handleSubmit = async (values) => {
        setLoading(true);
        setSubmitError("");

        try {
            const result = await register(values);

            if (result.success) {
                notifications.show({
                    title: "Welcome!",
                    message: "Your account has been created successfully.",
                    color: "green",
                });
                navigate("/login");
            } else {
                setSubmitError(result.error || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Registration error:", error);
            setSubmitError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Left Side - Form */}
            <div className="auth-form-section">
                <div className="auth-form-container">
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                        <Image
                            src={tootyLogo}
                            alt="Tutiful Logo"
                            width={120}
                            height={120}
                            fit="contain"
                            style={{ display: "block", margin: "0 auto" }}
                        />
                    </div>

                    <Title order={3} style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                        Get Started Now
                    </Title>

                    {/* Form */}
                    <form onSubmit={form.onSubmit(handleSubmit)} autoComplete="off">
                        <Stack spacing="lg">
                            <TextInput
                                label="Name"
                                placeholder="Enter your full name"
                                size="md"
                                {...form.getInputProps("name")}
                            />
                            <TextInput
                                label="Email address"
                                placeholder="Enter your email"
                                size="md"
                                {...form.getInputProps("email")}
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                size="md"
                                {...form.getInputProps("password")}
                            />
                            <TextInput
                                label="Phone"
                                placeholder="Enter your phone number"
                                size="md"
                                {...form.getInputProps("phone")}
                            />

                            {/* Back button */}
                            <Group justify="space-between" mt={8}>
                                <Anchor
                                    component="button"
                                    type="button"
                                    size="sm"
                                    onClick={() => navigate("/")}
                                >
                                    ← Back to Home
                                </Anchor>
                            </Group>

                            {submitError && (
                                <Notification color="red" onClose={() => setSubmitError("")}>
                                    {submitError}
                                </Notification>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                loading={loading}
                                fullWidth
                                style={{ marginTop: "1.5rem", marginBottom: "1rem" }}
                            >
                                {loading ? "Signing Up..." : "Sign up"}
                            </Button>

                            <Center>
                                <Text size="sm" c="dimmed">
                                    Have an account?{" "}
                                    <Anchor
                                        component="button"
                                        type="button"
                                        onClick={() => navigate("/login")}
                                    >
                                        Sign in
                                    </Anchor>
                                </Text>
                            </Center>
                        </Stack>
                    </form>
                </div>
            </div>

            {/* Right Side - Image with overlay */}
            <div className="auth-image-section">
                <Box
                    ta="center"
                    c="white"
                    p="xl"
                    style={{
                        height: "100%",
                        backgroundImage: `url(${tutorsImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        position: "relative",
                    }}
                >
                    <Box
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(102, 126, 234, 0.6)",
                        }}
                    />
                    <Box style={{ position: "relative", zIndex: 1 }}>
                        <Title
                            order={2}
                            mb="md"
                            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
                        >
                            Join Tutiful Today
                        </Title>
                        <Text size="lg" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                            Manage tutors, payments, and students with ease
                        </Text>
                    </Box>
                </Box>
            </div>
        </div>
    );
};

export default Register;