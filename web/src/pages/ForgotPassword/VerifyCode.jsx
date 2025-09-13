import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Title,
  Text,
  Button,
  Group,
  Anchor,
  PinInput,
  Stack,
  Image,
  Box,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../api/apiClient";
import logo from "../../assets/tooty.png";

const RESEND_SECONDS = 60;

// tolerant helpers for various backend/axios/fetch shapes
function getData(resLike) {
  return resLike?.data ?? resLike ?? {};
}
function extractResetToken(resLike) {
  const d = getData(resLike);
  return (
    d.resetToken ??
    d.token ??
    d.reset_token ??
    d.passwordResetToken ??
    null
  );
}
function isOk(resLike) {
  const s = resLike?.status ?? resLike?.statusCode ?? 200;
  return s >= 200 && s < 300;
}

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location?.state?.email;

  // keep email in session in case of hard refresh
  const [email, setEmail] = useState(
    emailFromState || sessionStorage.getItem("fp_email") || ""
  );
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // resend countdown
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (!email) {
      notifications.show({
        color: "yellow",
        title: "Email required",
        message: "Please enter your email again.",
      });
      navigate("/forgot-password", { replace: true });
      return;
    }
    sessionStorage.setItem("fp_email", email);
  }, [email, navigate]);

  // handle countdown persistently
  useEffect(() => {
    if (secondsLeft <= 0) return;
    sessionStorage.setItem("fp_resend_seconds", String(secondsLeft));
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || code.length !== 6) {
      notifications.show({
        color: "red",
        title: "Invalid code",
        message: "Please enter the 6-digit code sent to your email.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.verifyOtp(email.toLowerCase().trim(), code.trim());
      if (!isOk(res)) throw new Error("Could not verify code.");

      const resetToken = extractResetToken(res);
      if (!resetToken) throw new Error("Reset token missing.");

      // persist for next screen
      sessionStorage.setItem("fp_email", email);
      sessionStorage.setItem("fp_reset_token", resetToken);

      notifications.show({
        color: "green",
        title: "Code verified",
        message: "You can now set a new password.",
      });

      navigate("/forgot-password/new", {
        state: { email, resetToken },
        replace: true,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Verification failed",
        message:
          err?.message ||
          "The code is invalid or expired. Please try again or resend.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    try {
      const res = await api.resendOtp(email.toLowerCase().trim());
      const d = getData(res);
      const retryMs = Number(d.retryInMs ?? 0);
      const next = retryMs > 0 ? Math.ceil(retryMs / 1000) : RESEND_SECONDS;
      setSecondsLeft(next);
      sessionStorage.setItem("fp_resend_seconds", String(next));
      notifications.show({
        color: "blue",
        title: "New code sent",
        message: `Please check your inbox. You can resend again in ${next}s.`,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Could not resend",
        message:
          err?.message ||
          "We could not resend the code right now. Please try again shortly.",
      });
    }
  }

  return (
    <div className="auth-container">
      {/* Left (Form) */}
      <div className="auth-form-section">
        <div
          className="auth-form"
          style={{
            maxWidth: 520,
            padding: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            {/* Bigger, standardized logo */}
            <Image src={logo} alt="Logo" w={240} fit="contain" />
          </div>

          {/* Larger heading + subtitle to match ForgotEmail */}
          <Title order={2} size="2rem" mb="sm">
            Verify your email
          </Title>
          <Text c="dimmed" size="md" mb="lg">
            We’ve sent a 6-digit code to <b>{email}</b>
          </Text>

          <form onSubmit={onSubmit}>
            <Stack gap="lg">
              {/* Bigger PinInput boxes */}
              <PinInput
                length={6}
                type="number"
                value={code}
                onChange={setCode}
                oneTimeCode
                // size controls padding; styles lets us control box size explicitly
                size="xl"
                styles={{
                  input: {
                    width: 58,
                    height: 58,
                    fontSize: 22,
                    borderRadius: 10,
                  },
                }}
              />

              <Group justify="space-between" mt="xs">
                <Anchor
                  component="button"
                  type="button"
                  size="sm"
                  onClick={() =>
                    navigate("/forgot-password", { replace: true })
                  }
                >
                  Use a different email
                </Anchor>

                <Button
                  variant="subtle"
                  onClick={handleResend}
                  disabled={secondsLeft > 0}
                  size="md"
                >
                  {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
                </Button>
              </Group>

              <Button
                type="submit"
                loading={submitting}
                disabled={code.length !== 6}
                mt="sm"
                size="md"
              >
                Continue
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
          <Title
            order={2}
            mb="md"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
          >
            Welcome Back!
          </Title>
          <Text
            size="lg"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}
          >
            Continue managing your tutoring platform
          </Text>
        </Box>
      </div>
    </div>
  );
}
