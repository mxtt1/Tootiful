import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import Form from '../../components/form';

export default function editStudent() {
    const { id } = useLocalSearchParams();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        email: '',
        phone: '',
        gender: '',
        gradeLevel: '',
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudentData();
    }, []);
    
    const fetchStudentData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3000/api/students/${id || 1}`);
            
            if (response.ok) {
                const studentData = await response.json();
                // Update form data with fetched data
                setFormData({
                    firstName: studentData.firstName || "",
                    lastName: studentData.lastName || "",
                    dateOfBirth: studentData.dateOfBirth || "",
                    email: studentData.email || "",
                    phone: studentData.phone || "",
                });
            } else {
                Alert.alert('Error', 'Failed to fetch tutor data');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred while fetching data');
            console.error('Error fetching tutor data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text>Loading...</Text>
            </View>
        );
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
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
                gender: formData.gender,
                gradeLevel: formData.gradeLevel,
            };

            const response = await fetch('http://localhost:3000/api/students/1', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                Alert.alert('Success', 'Profile updated successfully');
            } else {
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
                <Link href="/tabs/myProfile" style={styles.backLink}>
                <Ionicons name="arrow-back" size={24} color="#6155F5" style={{ marginBottom: 20 }} />
                </Link>
                <Text style={styles.title}>Edit Profile</Text>
            </View>

            <Form 
            formData={formData}
            onInputChange={handleInputChange}
            onSave={handleSave}
            title="Edit Student Profile"
            showGradeLevel={true}
            showGender={true}
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
    title: {
        fontSize: 20,
        marginBottom: 10,
        fontWeight: 'bold',
        color: "#6155F5",
    },
});