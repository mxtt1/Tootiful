import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Checkbox,
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

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const wasRemembered = localStorage.getItem("rememberMe") === "true";

    if (wasRemembered && savedEmail) {
      form.setValues({
        email: savedEmail,
        password: "",
        rememberMe: true,
      });
    }
  }, []);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    validate: {
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
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    setSubmitError("");

    try {
      const result = await login(
        values.email,
        values.password,
        values.rememberMe
      );

      if (result.success) {
        // Handle Remember Me functionality
        if (values.rememberMe) {
          // Save only email to localStorage
          localStorage.setItem("rememberedEmail", values.email);
          localStorage.setItem("rememberMe", "true");
        } else {
          // Clear saved credentials if not remembering
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberMe");
        }

        notifications.show({
          title: "Welcome back!",
          message: "You have successfully logged in.",
          color: "green",
        });
        // Redirect based on user type/role
        if (
          result.user?.userType === "agency" ||
          result.user?.role === "agencyAdmin"
        ) {
          navigate("/agency/dashboard");
        } else {
          navigate("/admin/dashboard");
        }
      } else {
        // Show specific error for invalid email or password
        if (result.error) {
          const err = result.error.toLowerCase();
          if (err.includes("invalid email")) {
            setSubmitError("Invalid email. Please try again.");
          } else if (err.includes("invalid password")) {
            setSubmitError("Invalid password. Please try again.");
          } else {
            setSubmitError(result.error);
          }
        } else {
          setSubmitError("Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to Brian's forgot password page
    navigate("/forgot-password");
  };

  const handleRememberMeChange = (event) => {
    const isChecked = event.currentTarget.checked;
    form.setFieldValue("rememberMe", isChecked);

    // If unchecking remember me, optionally clear saved credentials immediately
    if (!isChecked) {
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberMe");
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          {/* Logo */}
          <div
            className="auth-logo"
            style={{ textAlign: "center", marginBottom: "2rem" }}
          >
            <Image
              src={tootyLogo}
              alt="Tutiful Logo"
              width={120}
              height={120}
              fit="contain"
              style={{ display: "block", margin: "0 auto" }}
            />
          </div>

          {/* Subtitle */}
          <Text
            size="sm"
            className="auth-subtitle"
            style={{ marginBottom: "2rem" }}
          >
            Enter your credentials to access your account
          </Text>

          {/* Form */}
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack spacing="lg">
              <TextInput
                label="Email address"
                placeholder="Enter your email"
                size="md"
                {...form.getInputProps("email")}
              />

              <div>
                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  size="md"
                  {...form.getInputProps("password")}
                />
                <Group justify="space-between" mt={8}>
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    onClick={() => navigate("/")}
                  >
                    ← Back to Home
                  </Anchor>

                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </Anchor>
                </Group>
              </div>

              <Checkbox
                label="Remember me"
                checked={form.values.rememberMe}
                onChange={handleRememberMeChange}
                style={{ marginTop: "0.5rem" }}
              />

              {submitError && (
                <Notification color="red" onClose={() => setSubmitError("")}>
                  {submitError}
                </Notification>
              )}

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="btn-primary"
                fullWidth
                style={{ marginTop: "1.5rem", marginBottom: "1rem" }}
              >
                {loading ? "Signing In..." : "Login"}
              </Button>

              <Center>
                <Text size="sm" c="dimmed">
                  Admin access only. Contact system administrator for account
                  access.
                </Text>
              </Center>
            </Stack>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="auth-image-section">
        <Box
          ta="center"
          c="white"
          p="xl"
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Title
            order={2}
            mb="md"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
          >
            Welcome Back!
          </Title>
          <Text size="lg" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
            Continue managing your tutoring platform
          </Text>
        </Box>
      </div>
    </div>
  );
};

export default Login;
