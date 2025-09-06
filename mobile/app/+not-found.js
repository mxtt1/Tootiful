import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFound() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Oops!" }} />
            <Text style={styles.title}>This page does not exist</Text>
            <Link href="/" style={styles.link}>
                <Text>Go back home</Text>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 20, marginBottom: 10 },
    link: { color: "blue" }
});