import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { validateName, validateEmail, validatePhone } from "../utils/validation";

export default function editStudent() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    gender: "",
    gradeLevel: "",
  });

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      //Get the authenticated user's ID
      let studentId = id;
      if (!studentId && authService.isAuthenticated()) {
        const token = authService.getCurrentToken();

        if (token) {
          try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split("")
                .map(function (c) {
                  return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
            );
            const payload = JSON.parse(jsonPayload);
            studentId = payload.userId;
          } catch (error) {
            console.error("Error decoding token:", error);
          }
        }
      }
      // Fallback to student ID 1 if no authenticated user
      studentId = studentId || 1;
      setCurrentUserId(studentId);
      console.log("Fetching student data for ID:", studentId);
      const studentData = await apiClient.get(`/students/${studentId}`);

      console.log("Fetched student data:", studentData);
      // Update form data with fetched data
      setFormData({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        dateOfBirth: studentData.dateOfBirth || "",
        email: studentData.email || "",
        phone: studentData.phone || "",
        gender: studentData.gender || "",
        gradeLevel: studentData.gradeLevel || "",
        image: studentData.image || null,
      });
    } catch (error) {
      console.error("Error fetching student data:", error);
      Alert.alert("Error", "An error occurred while fetching data");
      console.error("Error fetching student data:", error);
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // real time validation
    let error = "";
    if (field === 'firstName' || field === 'lastName') {
      error = validateName(value);
    }
    else if (field === 'email') {
      error = validateEmail(value);
    }
    else if (field === 'phone') {
      error = validatePhone(value);
    }
    setErrors((prev) => ({
      ...prev,
      [field]: error
    }));
  };



  const handleSave = async () => {
    setErrors({}); //clear prev errors

    //validate fields
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone);
    const firstNameError = validateName(formData.firstName);
    const lastNameError = validateName(formData.lastName);

    if (emailError || phoneError || firstNameError || lastNameError) {
    
    setErrors({
      email: emailError,
      phone: phoneError,
      firstName: firstNameError,
      lastName: lastNameError,
      });
      return;

    }

    try {
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        gradeLevel: formData.gradeLevel,
        image: formData.image,
      };

      const studentId = currentUserId || id || 1;
      console.log("Saving student profile for ID:", studentId);
      console.log("Profile data to save:", requestBody);

      await apiClient.patch(`/students/${studentId}`, requestBody);

      console.log("✅ Personal details updated successfully");
      // Use Alert for React Native compatibility
      Alert.alert(
        "Success",
        "Personal details updated successfully! Go back to profile?",
        [
          {
            text: "Stay Here",
            style: "cancel",
          },
          {
            text: "Go Back",
            onPress: () => {
              router.push("/tabs/myProfile");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      // Use Alert for React Native compatibility
      Alert.alert(
        "Error",
        "An error occurred while updating profile. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/tabs/myProfile" style={styles.backLink}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#6155F5"
            style={{ marginBottom: 20 }}
          />
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
        errors={errors}
      />
    </View>
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
    alignSelf: "flex-start",
    marginBottom: 10,
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#6155F5",
  },
});
