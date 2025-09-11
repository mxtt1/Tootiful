import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { validateName, validateEmail, validatePhone } from "../utils/validation";
import { jwtDecode } from "jwt-decode";

export default function PersonalDetails() {
  const { id } = useLocalSearchParams();
  const [errors, setErrors] = useState({});


  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null); // To track original data for changes

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchTutorData();
  }, []);

  const fetchTutorData = async () => {
    try {
      setLoading(true);

      // Get the authenticated user's ID
      let tutorId = id;
      if (!tutorId && authService.isAuthenticated()) {
        const token = authService.getCurrentToken();
        if (token) {
          try {
            const decoded = jwtDecode(token);
            tutorId = decoded.userId;
          } catch (error) {
            console.error("Error decoding token:", error);
          }
        }
      }
      setCurrentUserId(tutorId);

      console.log("Fetching tutor data for ID:", tutorId);
      const tutorData = await apiClient.get(`/tutors/${tutorId}`);

      console.log("Fetched tutor data:", tutorData);
      // Update form data with fetched data
      setFormData({
        firstName: tutorData.firstName || "",
        lastName: tutorData.lastName || "",
        dateOfBirth: tutorData.dateOfBirth || "",
        email: tutorData.email || "",
        phone: tutorData.phone || "",
      });

      setInitialData({
        firstName: tutorData.firstName || "",
        lastName: tutorData.lastName || "",
        dateOfBirth: tutorData.dateOfBirth || "",
        email: tutorData.email || "",
        phone: tutorData.phone || "",
      });

    } catch (error) {
      console.error("Error fetching tutor data:", error);
      Alert.alert("Error", "An error occurred while fetching data");
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
      // Prepare only changed fields
      const changedFields = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== initialData[key]) {
          changedFields[key] = formData[key];
        }
      });

      // Only send if there are changes
      if (Object.keys(changedFields).length === 0) {
        Alert.alert("No changes detected.");
        return;
      }

      // Wrap in tutorData object
      const requestBody = { tutorData: changedFields };

      const tutorId = currentUserId || id;
      console.log("Saving tutor data for ID:", tutorId);
      console.log("Request Body:", requestBody);

      await apiClient.patch(`/tutors/${tutorId}`, requestBody);

      console.log("✅ Personal details updated successfully");

      // Use Alert for mobile compatibility
      Alert.alert(
        "Success",
        "Personal details updated successfully! Go back to profile?",
        [
          { text: "Stay Here", style: "cancel" },
          {
            text: "Go Back",
            onPress: () => router.push("/tutor/myProfile"),
          },
        ]
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        "An error occurred while updating profile. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/tutor/editProfile" style={styles.backLink}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#6155F5"
            style={{ marginBottom: 20 }}
          />
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
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#6155F5",
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
