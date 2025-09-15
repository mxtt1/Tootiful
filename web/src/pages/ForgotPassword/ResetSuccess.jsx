import { useNavigate, useLocation } from "react-router-dom";
import { Title, Text, Button, Stack, Image, Box } from "@mantine/core";
import logo from "../../assets/tooty.png";

export default function ResetSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromReset = location?.state?.fromReset;

  const title = fromReset ? "Password reset successful" : "Action completed";
  const description = fromReset
    ? "You can now log in with your new password."
    : "Operation completed successfully.";

  return (
    <div className="auth-container">
      {/* Left (Message) */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Image src={logo} alt="Tutiful" width={140} className="auth-logo" />
          </div>

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
            Go to Login
          </Button>
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
