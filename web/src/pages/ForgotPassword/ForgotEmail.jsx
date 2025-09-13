import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Title, Text, TextInput, Button, Stack, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

export default function ForgotEmail() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      notifications.show({ color: "red", title: "Email required", message: "Please enter your email." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      notifications.show({ color: "red", title: "Invalid email", message: "Enter a valid email address." });
      return;
    }

    try {
      setSubmitting(true);
      await api.requestOtp(trimmed);
      notifications.show({ color: "green", title: "Code sent", message: "We’ve emailed you a 6-digit code." });
      navigate("/verify", { state: { email: trimmed } });
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;
      let msg;
      if (backendMsg) {
        msg = backendMsg;
      } else if (status === 404) {
        msg = "We couldn’t find an account with that email.";
      } else if (status === 429) {
        msg = "Too many attempts. Please wait a moment before retrying.";
      } else {
        msg = "Something went wrong. Please try again.";
      }
      notifications.show({ color: "red", title: "Error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-grid">
      <div className="auth-left">
        <div className="auth-left-inner">
          <Image src={logo} alt="Tutiful" width={140} className="auth-logo" />

          <Stack gap={6} mt={10}>
            <Title order={2} fw={700}>Forgot Password?</Title>
            <Text c="dimmed" size="sm">Enter your email to receive a 6-digit verification code.</Text>
          </Stack>

          <form onSubmit={onSubmit} style={{ marginTop: 22 }}>
            <Stack gap="md">
              <TextInput
                label="Email address"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                radius="md"
                size="md"
              />
              <Button type="submit" size="md" radius="md" loading={submitting} fullWidth styles={{ root: { height: 44 } }}>
                Send Code
              </Button>
            </Stack>
          </form>

          <Text size="xs" c="dimmed" mt="sm">
            Admin access only. Contact system administrator for account access.
          </Text>
        </div>
      </div>

      <div className="hero-pane" />

      <style>{`
        .auth-grid { min-height: 100vh; display: grid; grid-template-columns: 1fr; }
        @media (min-width: 960px) { .auth-grid { grid-template-columns: 480px 1fr; } }
        .auth-left { display: flex; align-items: center; padding: 64px 56px; }
        .auth-left-inner { width: 100%; max-width: 420px; margin: 0 auto; padding: 0 8px; }
        .auth-logo { display: block; }
        .hero-pane { display: none; }
        @media (min-width: 960px) {
          .hero-pane {
            display: block; position: relative;
            background-image: url('/images/stock_image.jpeg');
            background-size: cover; background-position: center; min-height: 100vh;
          }
          .hero-pane::after { content: ""; position: absolute; inset: 0; background: rgba(122,73,255,0.55); }
          .hero-pane::before {
            position: absolute; right: 8%; top: 45%; transform: translateY(-50%);
            color: #fff; font-weight: 800; font-size: 38px; text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
