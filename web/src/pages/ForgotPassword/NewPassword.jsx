import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Title,
  Text,
  PasswordInput,
  Button,
  Progress,
  List,
  Stack,
  Image,
  Box,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

// simple strength rules
function passwordIssues(email, pwd) {
  const issues = [];
  if (pwd.length < 12) issues.push("At least 12 characters");
  if (!/[a-z]/.test(pwd)) issues.push("Include a lowercase letter");
  if (!/[A-Z]/.test(pwd)) issues.push("Include an uppercase letter");
  if (!/[0-9]/.test(pwd)) issues.push("Include a number");
  if (!/[^\w\s]/.test(pwd)) issues.push("Include a symbol");
  if (email && pwd.toLowerCase().includes(email.split("@")[0]?.toLowerCase()))
    issues.push("Avoid using your email/username");
  return issues;
}

function passwordScore(issues) {
  const total = 5; // the first five checks map to the bar visually
  const good = Math.max(0, total - issues.filter((i) => i !== "Avoid using your email/username").length);
  return Math.round((good / total) * 100);
}

export default function NewPassword({ context }) {
  const navigate = useNavigate();
  const location = useLocation();

  // === NEW: context-aware paths ===
  const isAgency = context === "agency" || window.location.pathname.startsWith("/agency/");
  const baseForgotPath = isAgency ? "/agency/forgot-password" : "/forgot-password";
  // ================================

  const emailFromState = location?.state?.email;
  const tokenFromState = location?.state?.resetToken;

  const [email, setEmail] = useState(
    emailFromState || sessionStorage.getItem("fp_email") || ""
  );
  const [resetToken, setResetToken] = useState(
    tokenFromState || sessionStorage.getItem("fp_reset_token") || ""
  );

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email || !resetToken) {
      notifications.show({
        color: "yellow",
        title: "Session expired",
        message: "Please verify your email again.",
      });
      // CHANGED: go back to the context-aware start page
      navigate(baseForgotPath, { replace: true });
      return;
    }
    sessionStorage.setItem("fp_email", email);
    sessionStorage.setItem("fp_reset_token", resetToken);
  }, [email, resetToken, navigate, baseForgotPath]);

  const issues = useMemo(() => passwordIssues(email, pwd), [email, pwd]);
  const score = useMemo(() => passwordScore(issues), [issues]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || !resetToken) {
      notifications.show({
        color: "red",
        title: "Missing token",
        message: "Please restart the reset process.",
      });
      // CHANGED: context-aware
      navigate(baseForgotPath, { replace: true });
      return;
    }
    if (pwd !== pwd2) {
      notifications.show({
        color: "red",
        title: "Passwords do not match",
        message: "Please retype the same password in both fields.",
      });
      return;
    }
    if (issues.length > 0) {
      notifications.show({
        color: "yellow",
        title: "Please strengthen your password",
        message: issues.join(" • "),
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.resetPassword(
        email.toLowerCase().trim(),
        resetToken,
        pwd
      );

      // treat any 2xx as success, backend returns {message: "Password updated."}
      if (!(res?.status ? res.status >= 200 && res.status < 300 : true)) {
        throw new Error("Failed to update password.");
      }

      // cleanup
      sessionStorage.removeItem("fp_reset_token");
      // keep the email around only if you want prefill on login:
      // sessionStorage.removeItem("fp_email");

      notifications.show({
        color: "green",
        title: "Password updated",
        message: "You can now log in with your new password.",
      });

      // CHANGED: context-aware success route
      navigate(`${baseForgotPath}/success`, { replace: true });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Unable to update password",
        message:
          err?.message ||
          "The link/token may be invalid or expired. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      {/* Left (Form) */}
      <div className="auth-form-section">
        <div className="auth-form" style={{ maxWidth: 480, padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <Image src={logo} alt="Logo" w={240} fit="contain" />
          </div>

          <Title order={2} size="2rem" mb="sm">
            Set a new password
          </Title>
          <Text c="dimmed" size="md" mb="lg">
            Email: <b>{email}</b>
          </Text>

          <form onSubmit={onSubmit}>
            <Stack gap="md">
              <PasswordInput
                label="New password"
                value={pwd}
                onChange={(e) => setPwd(e.currentTarget.value)}
                withAsterisk
              />
              <PasswordInput
                label="Confirm new password"
                value={pwd2}
                onChange={(e) => setPwd2(e.currentTarget.value)}
                withAsterisk
              />

              <Progress value={score} aria-label="Password strength" />
              {issues.length > 0 && (
                <List size="sm" c="red">
                  {issues.map((it) => (
                    <List.Item key={it}>{it}</List.Item>
                  ))}
                </List>
              )}

              <Button type="submit" loading={submitting}>
                Update password
              </Button>
            </Stack>
          </form>
        </div>
      </div>

      {/* Right (Image area) */}
      <div className="auth-image-section forgot-bg">
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
        </Box>
      </div>
    </div>
  );
}
