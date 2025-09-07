import { View, Text, StyleSheet, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";

export default function PersonalDetails() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
  });

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
            tutorId = payload.userId;
          } catch (error) {
            console.error("Error decoding token:", error);
          }
        }
      }

      // Fallback to tutor ID 1 if no authenticated user
      tutorId = tutorId || 1;
      setCurrentUserId(tutorId);

      console.log("Fetching tutor data for ID:", tutorId);
      const response = await fetch(
        `http://localhost:3000/api/tutors/${tutorId}`
      );

      if (response.ok) {
        const tutorData = await response.json();
        console.log("Fetched tutor data:", tutorData);
        // Update form data with fetched data
        setFormData({
          firstName: tutorData.firstName || "",
          lastName: tutorData.lastName || "",
          dateOfBirth: tutorData.dateOfBirth || "",
          email: tutorData.email || "",
          phone: tutorData.phone || "",
        });
      } else {
        console.error("Failed to fetch tutor data:", response.status);
        alert("Error: Failed to fetch tutor data");
      }
    } catch (error) {
      console.error("Error fetching tutor data:", error);
      alert("Error: An error occurred while fetching data");
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
  };

  const handleSave = async () => {
    try {
      // Wrap data in tutorData object as expected by API
      const requestBody = {
        tutorData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          email: formData.email,
          phone: formData.phone,
        },
      };

      const tutorId = currentUserId || id || 1;
      console.log("Saving tutor data for ID:", tutorId);
      console.log("Request Body:", requestBody);

      const response = await fetch(
        `http://localhost:3000/api/tutors/${tutorId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        console.log("✅ Personal details updated successfully");

        // Use confirm dialog for web compatibility
        const shouldNavigateBack = confirm(
          "Success: Personal details updated successfully! Go back to profile?"
        );

        if (shouldNavigateBack) {
          // Navigate back to tutor profile
          router.push("/tutor/myProfile");
        }
      } else {
        console.error("Failed to update profile:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);

        // Use confirm for web compatibility
        confirm("Error: Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      // Use confirm for web compatibility
      confirm(
        "Error: An error occurred while updating profile. Please try again."
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
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
});
