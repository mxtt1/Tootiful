import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from "react-native";
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from "expo-router";

export default function TeachingInfo() {
    const [formData, setFormData] = useState({
        hourlyRate: '',
        aboutMe: '',
        education: '',
        subjects: '',
    });
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/tutors/1', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Alert.alert('Success', 'Teaching Info updated successfully');
            } else {
                Alert.alert('Error', 'Failed to update Teaching Info');
            } 
        } catch (error) {
                Alert.alert('Error', 'An error occurred while updating Teaching Info');
                console.error('Error updating Teaching Info:', error);
        }
    };

    return (  
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Link href="/tutor/editProfile" style={styles.backLink}>
                <Ionicons name="arrow-back" size={24} color="#6155F5" style={{ marginBottom: 20 }} />
                </Link>
            <Text style={styles.title}>Teaching Info</Text>
            </View>

            <View style={styles.formContainer}>
                {/* Hourly Rate */}
                <View style={styles.inputContainer}>
                    <Ionicons name="cash-outline" size={20} style={styles.styleIcon}/>
                <TextInput 
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder="Hourly Rate"
                    value={formData.hourlyRate || ''}
                        onChangeText={(text) => handleInputChange('hourlyRate', text)}
                        keyboardType="numeric"
                />
                </View>

                {/* About Me */}
                <Text style={styles.subTitle}>About Me</Text>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        placeholder="Hi I'm starvin"
                        value={formData.aboutMe || ''}
                        onChangeText={(text) => handleInputChange('aboutMe', text)}
                    />
                </View>  

                {/* Education */}
                <Text style={styles.subTitle}>Education</Text>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={2}
                        placeholder="NUS"
                        value={formData.education || ''}
                        onChangeText={(text) => handleInputChange('education', text)}
                    />
                </View> 

                {/* Subjects */}
                <Text style={styles.subTitle}>Subject of Expertise</Text>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        placeholder="Physics"
                        value={formData.subjects || ''}
                        onChangeText={(text) => handleInputChange('subjects', text)}
                    />
                </View> 

                {/* Save Button */}
                <TouchableOpacity style={styles.button} onPress={handleSave}>
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
    title: {
        fontSize: 20,
        marginBottom: 10,
        fontWeight: 'bold',
        color: "#6155F5",
    },
    subTitle: {
        fontSize: 15,
        marginBottom: 10,
        fontWeight: 'bold',
        color: "#6155F5",
        marginLeft: 10,
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
      button: {
    backgroundColor: '#6155F5',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
    iconText: {
    color: "#202244",
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  input: {
    height: 50,
    paddingLeft: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#374151',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,  
  },
  textArea: {
        height: 120,
        paddingTop: 15,
        textAlignVertical: 'top',
  },
    styleIcon: {
    position: 'absolute',
    left: 10,
    top: 15,
    zIndex: 1,
    color:"#6B7280"
  },
    inputWithIcon: {
    paddingLeft: 40,
  },
  formContainer: {
    marginTop: 10,
  },

});