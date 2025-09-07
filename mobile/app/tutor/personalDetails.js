import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Form from '../../components/form';
import { Link } from "expo-router";

export default function PersonalDetails() {

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        email: "",
        phone: "",
    });

    const handleInputChange = (field, value) => {setFormData(prev => ({
        ...prev,
        [field]: value

        }));
    };

    const handleSave = async () => {
        try {
            const requestBody = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dateOfBirth,
                email: formData.email,
                phone: formData.phone,
            };
            const response = await fetch('http://localhost:3000/api/tutors/1', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                Alert.alert('Success', 'Profile updated successfully');
            }
            else {
                Alert.alert('Error', 'Failed to update profile');
            }
            } catch (error) {
                Alert.alert('Error', 'An error occurred while updating profile');
                console.error('Error updating profile:', error);
        }
    };

    return ( 
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Link href="/tutor/editProfile" style={styles.backLink}>
                <Ionicons name="arrow-back" size={24} color="#6155F5" style={{ marginBottom: 20 }} />
                </Link>
            <Text style={styles.title}>Personal Details</Text>
            </View>
            <Form
            formData={formData}
            onInputChange={handleInputChange}
            onSave={handleSave}
            showGradeLevel={false}
            showGender={false}
            saveButtonText="Save"
            />
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
    title: {
        fontSize: 20,
        marginBottom: 10,
        fontWeight: 'bold',
        color: "#6155F5",
    },
    backLink: {
        alignSelf: 'flex-start',
        marginBottom: 10,
        marginRight: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
});