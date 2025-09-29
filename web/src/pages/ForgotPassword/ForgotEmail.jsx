import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Title, Text, TextInput, Button, Stack, Image, Box, Anchor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

// Robust success detector that works with either Axios response or plain data
function isSuccessResponse(resLike) {
  const status = resLike?.status ?? resLike?.statusCode ?? 200;
  const data = resLike?.data ?? resLike ?? {};
  const msg = (data?.message ?? data?.msg ?? "").toString();

  const hasSuccessFlag =
    data?.success === true ||
    data?.ok === true ||
    data?.status === "ok" ||
    data?.status === "success";

  const hasSuccessWords = /sent|success|ok/i.test(msg);
  const isHttpOk = typeof status === "number" && status >= 200 && status < 300;

  return isHttpOk || hasSuccessFlag || hasSuccessWords;
}

export default function ForgotEmail({ context }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // === NEW: context-aware paths (works even if no prop is passed) ===
  const isAgency = context === "agency" || window.location.pathname.startsWith("/agency/");
  const baseForgotPath = isAgency ? "/agency/forgot-password" : "/forgot-password";
  const loginPath = isAgency ? "/agency" : "/login";
  // =================================================================

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      notifications.show({ color: "red", title: "Email required", message: "Please enter your email." });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      notifications.show({ color: "red", title: "Invalid email", message: "Please enter a valid email address." });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/auth/forgot-password", { email: trimmed });

      if (isSuccessResponse(res)) {
        const data = res?.data ?? res ?? {};
        const msg = (data?.message ?? "Check your inbox for the 6-digit code.").toString();

        notifications.show({ color: "green", title: "Code sent", message: msg });

        // Persist for Verify page
        localStorage.setItem("resetEmail", trimmed);

        // === CHANGED: use context-aware path ===
        navigate(`${baseForgotPath}/verify`, { state: { email: trimmed, justSent: true }, replace: true });
      } else {
        const data = res?.data ?? res ?? {};
        notifications.show({
          color: "red",
          title: "Unable to send code",
          message: (data?.message ?? "Please try again.").toString(),
        });
      }
    } catch (err) {
      // Some backends still send the email but reply 4xx with a “sent” message.
      const data = err?.response?.data ?? {};
      const msg = (data?.message ?? "").toString();

      if (/sent/i.test(msg)) {
        notifications.show({ color: "green", title: "Code sent", message: msg || "Check your inbox for the 6-digit code." });
        localStorage.setItem("resetEmail", trimmed);
        // === CHANGED: use context-aware path ===
        navigate(`${baseForgotPath}/verify`, { state: { email: trimmed, justSent: true }, replace: true });
      } else {
        notifications.show({ color: "red", title: "Server error", message: msg || "Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left (Form) */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Image src={logo} alt="Tutiful" width={140} className="auth-logo" />
          </div>

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
                size="md"
                withAsterisk
              />

              <Button type="submit" size="md" radius="md" loading={submitting} fullWidth styles={{ root: { height: 44 } }}>
                Send Code
              </Button>

              <Text size="sm" c="dimmed">
                Remembered your password?{" "}
                {/* CHANGED: back to login respects Agency context */}
                <Anchor onClick={() => navigate(loginPath)} component="button" type="button">
                  Back to login
                </Anchor>
              </Text>
            </Stack>
          </form>

          <Text size="xs" c="dimmed" mt="sm">
            Admin access only. Contact system administrator for account access.
          </Text>
        </div>
      </div>

      {/* Right (Image) */}
      <div className="auth-image-section forgot-bg">
        <Box ta="center" c="white" p="xl" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        </Box>
      </div>
    </div>
  );
}
