import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      {/* Root index.js → Redirects to login */}
      <Stack.Screen name="index" />
      {/* Auth screens */}
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />

    </Stack>
  );
}