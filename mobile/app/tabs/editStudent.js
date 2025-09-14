import { View, Text, StyleSheet, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { validateName, validateEmail, validatePhone, validateDateOfBirth } from "../utils/validation";
import { jwtDecode } from "jwt-decode"
import supabase from "../../services/supabaseClient";

export default function editStudent() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null); // To track original data for changes
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
        const token = await authService.getCurrentToken();

        if (token) {
          try {
            const decoded = jwtDecode(token);
            studentId = decoded.userId;
          } catch (error) {
            console.error("Error decoding token:", error);
          }
        }
      }

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
        image: studentData.image || "",
      });

      setInitialData({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        dateOfBirth: studentData.dateOfBirth || "",
        email: studentData.email || "",
        phone: studentData.phone || "",
        gender: studentData.gender || "",
        gradeLevel: studentData.gradeLevel || "",
        image: studentData.image || "",
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
    else if (field === 'dateOfBirth') {
      error = validateDateOfBirth(value);
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
    const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);

    if (emailError || phoneError || firstNameError || lastNameError || dateOfBirthError) {

      setErrors({
        email: emailError,
        phone: phoneError,
        firstName: firstNameError,
        lastName: lastNameError,
        dateOfBirth: dateOfBirthError,
      });
      return;
    }

    // Upload image to Supabase Storage if it's a local file
    let imageUrl = formData.image;
    if (imageUrl && imageUrl.startsWith('file://')) {
      try {
        const imageExt = imageUrl.split('.').pop();

        let contentType = 'image/png'; // default
        if (imageExt === 'jpg' || imageExt === 'jpeg') {
          contentType = 'image/jpeg';
        } else if (imageExt === 'png') {
          contentType = 'image/png';
        } // add more types as needed

        const fileName = `student_${currentUserId || id}`;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const { data, error } = await supabase.storage.from('avatars').upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType // sets the correct MIME type,
        });
        console.log("Supabase upload response:", data, error);
        if (error) {
          throw new Error('Image upload failed: ' + error.message);
        }
        // Get public URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
        console.log("Image public URL:", imageUrl);
        // Do NOT rely on setFormData here, just use imageUrl for PATCH
      } catch (err) {
        Alert.alert('Error', 'Image upload failed: ' + err.message);
        return;
      }
    }

    try {
      const requestBody = {};
      Object.keys(formData).forEach((key) => {
        // For image, use the latest public URL if it was just uploaded
        if (key === 'image' && imageUrl !== initialData.image) {
          requestBody[key] = imageUrl;
        } else if (formData[key] !== initialData[key] && key !== 'image') {
          requestBody[key] = formData[key];
        }
      });

      // Only send if there are changes
      if (Object.keys(requestBody).length === 0) {
        Alert.alert("No changes detected.");
        return;
      }
      const studentId = currentUserId || id;
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
