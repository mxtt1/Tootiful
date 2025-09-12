import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Title, Text, Button, Group, Anchor, PinInput, Stack, Image } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

const RESEND_SECONDS = 60;

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location?.state?.email;

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      notifications.show({ color: "red", title: "Invalid code", message: "Enter the 6-digit code." });
      return;
    }
    try {
      setSubmitting(true);
      const { resetToken } = await api.verifyOtp(email, code);
      navigate("/new-password", { state: { email, resetToken } });
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;
      let msg;
      if (backendMsg) {
        msg = backendMsg;
      } else if (status === 400) {
        msg = "The code is invalid or has expired.";
      } else {
        msg = "Something went wrong. Please try again.";
      }
      notifications.show({ color: "red", title: "Verification failed", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    try {
      setResending(true);
      await api.resendOtp(email);
      setCooldown(RESEND_SECONDS);
      notifications.show({ color: "green", title: "Code resent", message: "Check your email again." });
    } catch (err) {
      const backendMsg = err?.response?.data?.message;
      notifications.show({
        color: "red",
        title: "Couldn’t resend",
        message: backendMsg || "Please try again later.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-grid">
      <div className="auth-left">
        <div className="auth-left-inner">
          <Image src={logo} alt="Tutiful" width={140} className="auth-logo" />
          <Stack gap={6} mt={10}>
            <Title order={2} fw={700}>Verify Code</Title>
            <Text c="dimmed" size="sm">We sent a code to <strong>{email}</strong>. Enter it below.</Text>
          </Stack>

          <form onSubmit={onSubmit} style={{ marginTop: 22 }}>
            <Stack gap="md">
              <Group justify="center">
                <PinInput length={6} size="lg" radius="md" type="number" oneTimeCode value={code} onChange={setCode} />
              </Group>
              <Button type="submit" size="md" radius="md" loading={submitting} fullWidth styles={{ root: { height: 44 } }}>
                Continue
              </Button>
              <Group justify="space-between" mt="xs">
                <Text size="sm" c="dimmed">Didn’t get a code?</Text>
                <Anchor component="button" type="button" onClick={onResend} disabled={cooldown > 0 || resending} fz="sm">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Anchor>
              </Group>
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
