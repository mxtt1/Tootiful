import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Picker } from '@react-native-picker/picker';
import { Link } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function editStudent() {
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedGrade, setSelectedGrade] = useState("");

    return (
        <ScrollView style={styles.container}>
            <Link href="/" style={styles.backLink}>
            <Ionicons name="arrow-back" size={24} color="#6155F5" style={{ marginBottom: 20 }} />
            </Link>

            <Text style={styles.title}>Edit Profile</Text>

            {/* Profile Image */}
            <View style={styles.imageBg}>
                <View style={styles.image}>
                    <Text style={styles.iconText}>+</Text>
                </View> 
            </View>

            {/* First Name */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="FirstName"/>
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="LastName"/>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
                <Ionicons name="calendar" size={20} style={{ position: 'absolute', left: 10, top: 15, zIndex: 1 }} />
                <TextInput style={styles.input}placeholder="Date of Birth"/>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="Email"/>
            </View>

            {/* Phone Number */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="Phone Number"/>
            </View>

            {/* Gender */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="Gender"/>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedGender}
                        onValueChange={(itemValue) => setSelectedGender(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Gender" value="" />
                        <Picker.Item label="Male" value="male" />
                        <Picker.Item label="Female" value="female" />
                        </Picker>
                    </View>
                    </View>

            {/* Grade Level */}
            <View style={styles.inputContainer}>
                <TextInput style={styles.input}placeholder="Grade Level"/>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedGrade}
                        onValueChange={(itemValue) => setSelectedGrade(itemValue)}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Grade Level" value="" />
                        <Picker.Item label="Primary" value="Primary" />
                        <Picker.Item label="Secondary" value="Secondary" />
                        <Picker.Item label="JC" value="JC" />
                        <Picker.Item label="International" value="International" />
                    </Picker>
                </View>
            </View>

            {/* Save Button */}
            <View style={styles.saveButton}>
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            </View>
             
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        padding: 20,
        backgroundColor: "#FFF",
    },
    backLink: {
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Mulish',
        fonSize: 30,
        color: "#6155F5",
        fontWeight: '700',
        marginBottom: 10,
    },
    header: {
        fontSize: 30,
        fontWeight: 'bold',
        color: "#6155F5",
        textAlign: 'center',
        marginVertical: 20,
    },
    imageBg: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "#fff",
        borderWidth: 3,
        borderColor: "#6155F5",
        alignSelf: 'center',
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: 32,
        height: 32,
        backgroundColor: "#fff",
        borderWidth: 3,
        borderColor: "#202244",
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        color: "#202244",
        fontSize: 20,
        fontWeight: "bold",
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'Mulish',
        fontSize: 14,
        fontWeight: '700',
        color: '#505050',
        marginBottom: 5,
    },
    input: {
        height: 50,
        paddingLeft: 10,
        borderRadius: 12,
        backgroundColor: '#fff',
        fontSize: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,  
    },
    saveButton: {
        backgroundColor: '#6155F5',
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        marginTop: 20,
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    link: {
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
        color: "#6155F5",
        fontWeight: 'bold',
    },
});