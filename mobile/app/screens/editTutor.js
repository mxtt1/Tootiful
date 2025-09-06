import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function editTutor() {
    return ( 
        <View style={styles.container}>
            <Text style={styles.title}>Hello World 👋</Text>
            <Text style={styles.subtitle}>I love editTutor.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    }
});
