import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import DropDownPicker from "react-native-dropdown-picker";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";

export default function TeachingInfo() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    hourlyRate: "",
    aboutMe: "",
    education: "",
  });

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Dropdown states
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectValue, setSubjectValue] = useState([]);
  const [subjectItems, setSubjectItems] = useState([]);

  useEffect(() => {
    fetchTutorData();
    fetchAvailableSubjects();
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
      const tutorData = await apiClient.get(`/tutors/${tutorId}`);

      console.log("Fetched teaching data:", tutorData);
      // Update form data with fetched data
      setFormData({
        hourlyRate: tutorData.hourlyRate || "",
        aboutMe: tutorData.aboutMe || "",
        education: tutorData.education || "",
      });

      if (tutorData.subjects) {
        const subjectIds = tutorData.subjects.map((subj) => subj.id);
        setSubjectValue(subjectIds);
      }
    } catch (error) {
      console.error("Error fetching teaching data:", error);
      Alert.alert("Error", "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSubjects = async () => {
    try {
      console.log("Fetching subjects from backend...");
      const subjects = await apiClient.get("/tutors/subjects/all");

      console.log("Subjects received:", subjects);
      // Convert subjects to dropdown format
      const dropdownItems = subjects.map((subject) => ({
        label: subject.name,
        value: subject.id,
      }));
      setSubjectItems(dropdownItems);
    } catch (error) {
      console.error("Error fetching subjects:", error);
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

      // Wrap data in tutorData object as expected by API
      const requestBody = {
        tutorData: {
          hourlyRate: formData.hourlyRate,
          aboutMe: formData.aboutMe,
          education: formData.education,
        },
        subjects: subjectValue.map((subjectId) => ({
          subjectId: subjectId,
          experienceLevel: "intermediate", // Default
        })),
      };
      console.log("Teaching data to save:", requestBody);

      await apiClient.patch(`/tutors/${tutorId}`, requestBody);

      console.log("Teaching info updated successfully");
      Alert.alert("Success", "Teaching Info updated successfully");
    } catch (error) {
      console.error("Error updating teaching info:", error);
      Alert.alert("Error", "An error occurred while updating Teaching Info");
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
        <Text style={styles.subTitle}>Subject of Expertise</Text>
        <DropDownPicker
          open={subjectOpen}
          value={subjectValue}
          items={subjectItems}
          setOpen={setSubjectOpen}
          setValue={setSubjectValue}
          setItems={setSubjectItems}
          multiple={true}
          mode="BADGE"
          badgeDotColors={[
            "#6155F5",
            "#e76f51",
            "#e9c46a",
            "#2a9d8f",
            "#264653",
          ]}
          placeholder="Select subjects you teach"
          style={styles.input}
          dropDownContainerStyle={styles.dropdown}
          textStyle={styles.dropdownText}
          selectedItemLabelStyle={styles.selectedItemText}
        />

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
  subjectItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedSubject: {
    backgroundColor: "#6155F5",
    borderColor: "#6155F5",
  },
  dropdown: {
    borderColor: "#ccc",
    borderRadius: 12,
    marginTop: 5,
  },
  dropdownText: {
    fontSize: 14,
  },
  selectedItemText: {
    color: "#6155F5",
    fontWeight: "bold",
  },
});
