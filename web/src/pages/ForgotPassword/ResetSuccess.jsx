import { useNavigate, useLocation } from "react-router-dom";
import { Title, Text, Button, Stack, Image } from "@mantine/core";
import logo from "../../assets/tooty.png";

export default function ResetSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromReset = location?.state?.fromReset;

  // Decide text depending on how the user arrived
  const title = fromReset ? "Password reset successful" : "Action completed";
  const description = fromReset
    ? "You can now log in with your new password."
    : "Operation completed successfully.";

  return (
    <div className="auth-grid">
      <div className="auth-left">
        <div className="auth-left-inner">
          <Image src={logo} alt="Tutiful" width={140} className="auth-logo" />

          <Stack gap={6} mt={10}>
            <Title order={2} fw={700}>{title}</Title>
            <Text c="dimmed" size="sm">{description}</Text>
          </Stack>

          <Button
            mt="lg"
            size="md"
            radius="md"
            fullWidth
            styles={{ root: { height: 44 } }}
            onClick={() => navigate("/login")}
          >
            Back to Login
          </Button>
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
