import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Title, Text, PasswordInput, Button, Progress, List, Stack, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

function passwordIssues(email, pwd) {
  const issues = [];
  if (pwd.length < 12) issues.push("At least 12 characters");
  if (!/[a-z]/.test(pwd)) issues.push("Include a lowercase letter");
  if (!/[A-Z]/.test(pwd)) issues.push("Include an uppercase letter");
  if (!/[0-9]/.test(pwd)) issues.push("Include a number");
  if (!/[^\w\s]/.test(pwd)) issues.push("Include a symbol");
  if (email && pwd.toLowerCase().includes(email.split("@")[0].toLowerCase()))
    issues.push("Avoid using parts of your email");
  return issues;
}

function strengthScore(pwd) {
  let s = 0;
  if (pwd.length >= 12) s += 25;
  if (/[a-z]/.test(pwd)) s += 15;
  if (/[A-Z]/.test(pwd)) s += 20;
  if (/[0-9]/.test(pwd)) s += 20;
  if (/[^\w\s]/.test(pwd)) s += 20;
  return Math.min(100, s);
}

export default function NewPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location?.state?.email;
  const resetToken = location?.state?.resetToken;

  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!email || !resetToken) navigate("/forgot-password", { replace: true });
  }, [email, resetToken, navigate]);

  const issues = useMemo(() => passwordIssues(email, pwd), [email, pwd]);
  const score = useMemo(() => strengthScore(pwd), [pwd]);
  const canSubmit = pwd && pwd === confirm && issues.length === 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await api.resetPassword(email, resetToken, pwd);
      notifications.show({ color: "green", title: "Password updated", message: "Your password has been reset." });
      navigate("/success", { state: { fromReset: true } });
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;
      let msg;
      if (backendMsg) {
        msg = backendMsg;
      } else if (status === 400) {
        msg = "Password reset failed. Please check your link or code.";
      } else {
        msg = "Something went wrong. Please try again.";
      }
      notifications.show({ color: "red", title: "Reset failed", message: msg });
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
            <Title order={2} fw={700}>Create a new password</Title>
            <Text c="dimmed" size="sm">
              Use at least 12 characters with a mix of letters, numbers, and symbols.
            </Text>
          </Stack>

          <form onSubmit={onSubmit} style={{ marginTop: 22 }}>
            <Stack gap="md">
              <PasswordInput
                label="New password"
                value={pwd}
                onChange={(e) => setPwd(e.currentTarget.value)}
                size="md"
                withAsterisk
                placeholder="Enter a strong password"
              />
              <Progress value={score} aria-label="Password strength" />
              {issues.length > 0 && (
                <List size="sm" c="dimmed" mt={-6}>
                  {issues.map((i) => <List.Item key={i}>{i}</List.Item>)}
                </List>
              )}
              <PasswordInput
                label="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                size="md"
                withAsterisk
                error={confirm && confirm !== pwd ? "Passwords do not match" : null}
              />
              <Button type="submit" size="md" radius="md" loading={submitting} disabled={!canSubmit} fullWidth styles={{ root: { height: 44 } }}>
                Update Password
              </Button>
            </Stack>
          </form>
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
