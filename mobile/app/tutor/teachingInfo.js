import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import authService from "../../services/authService";

export default function TeachingInfo() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    hourlyRate: "",
    aboutMe: "",
    education: "",
    subjects: "",
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

      console.log("Fetching teaching info for tutor ID:", tutorId);
      const response = await fetch(
        `http://localhost:3000/api/tutors/${tutorId}`
      );

      if (response.ok) {
        const tutorData = await response.json();
        console.log("Fetched teaching data:", tutorData);
        // Update form data with fetched data
        setFormData({
          hourlyRate: tutorData.hourlyRate || "",
          aboutMe: tutorData.aboutMe || "",
          education: tutorData.education || "",
        });
      } else {
        console.error("Failed to fetch teaching data:", response.status);
        alert("Error: Failed to fetch tutor data");
      }
    } catch (error) {
      console.error("Error fetching teaching data:", error);
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
      const tutorId = currentUserId || id || 1;
      console.log("Saving teaching info for tutor ID:", tutorId);
      console.log("Teaching data to save:", formData);

      // Wrap data in tutorData object as expected by API
      const requestBody = {
        tutorData: {
          hourlyRate: formData.hourlyRate,
          aboutMe: formData.aboutMe,
          education: formData.education,
        },
    };

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
        console.log("Teaching info updated successfully");
        alert("Success: Teaching Info updated successfully");
      } else {
        console.error("Failed to update teaching info:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        alert("Error: Failed to update Teaching Info");
      }
    } catch (error) {
      console.error("Error updating teaching info:", error);
      alert("Error: An error occurred while updating Teaching Info");
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
        <Text style={styles.title}>Teaching Info</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Hourly Rate */}
        <View style={styles.inputContainer}>
          <Ionicons name="cash-outline" size={20} style={styles.styleIcon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Hourly Rate"
            value={formData.hourlyRate || ""}
            onChangeText={(text) => handleInputChange("hourlyRate", text)}
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
            value={formData.aboutMe || ""}
            onChangeText={(text) => handleInputChange("aboutMe", text)}
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
            value={formData.education || ""}
            onChangeText={(text) => handleInputChange("education", text)}
          />
        </View>


        {/* Subjects */}
    {/*    <Text style={styles.subTitle}>Subject of Expertise</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            placeholder="Physics"
            value={formData.subjects || ""}
            onChangeText={(text) => handleInputChange("subjects", text)}
          />
        </View>
        */}

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
    fontWeight: "bold",
    color: "#6155F5",
  },
  subTitle: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#6155F5",
    marginLeft: 10,
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
  button: {
    backgroundColor: "#6155F5",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  iconText: {
    color: "#202244",
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    marginBottom: 20,
    position: "relative",
  },
  input: {
    height: 50,
    paddingLeft: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#374151",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  textArea: {
    height: 120,
    paddingTop: 15,
    textAlignVertical: "top",
  },
  styleIcon: {
    position: "absolute",
    left: 10,
    top: 15,
    zIndex: 1,
    color: "#6B7280",
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  formContainer: {
    marginTop: 10,
  },
});
