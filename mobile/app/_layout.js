import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51SIovPAAoAUEOUubDMOoYGXzcqo92LrSwm5OJ1u3k8nm3zZKSHeVYbjVyIGzydYs6hnOnQoHFhsfiO58aio3ZpkB001LdxeTKG";

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        {/* Root index.js → Redirects to login */}
        <Stack.Screen name="index" />
        {/* Auth screens */}
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        {/* Payment screens */}
        <Stack.Screen name="payment" />
        <Stack.Screen name="payment-success" />
      </Stack>
    </StripeProvider>
  );
}
