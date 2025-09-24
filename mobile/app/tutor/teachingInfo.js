import {
  SafeAreaView,
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
import { validateHourlyRate } from "../utils/validation";
import { jwtDecode } from "jwt-decode";

export default function TeachingInfo() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null); // track original data if changed
  const [subjectRates, setSubjectRates] = useState({}); // track original (subjects + rates) if changed
  const [initialSubjectRates, setInitialSubjectRates] = useState({});

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [errors, setErrors] = useState({});

  // Dropdown states
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectValue, setSubjectValue] = useState([]); //selected subjects
  const [subjectItems, setSubjectItems] = useState([]); //available subjects

    useEffect(() => {
      console.log("subjectValue updated:", subjectValue);
      console.log("Type of subjectValue:", typeof subjectValue);
      console.log("Is array?", Array.isArray(subjectValue));
    
      if (Array.isArray(subjectValue)) {
        subjectValue.forEach((item, index) => {
          console.log(`subjectValue[${index}]:`, item, "type:", typeof item);
        });
      }
    }, [subjectValue]);

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
            const decoded = jwtDecode(token);
            tutorId = decoded.userId;
          } catch (error) {
            console.error("Error decoding token:", error);
          }
        }
      }

      setCurrentUserId(tutorId);

      console.log("Fetching teaching info for tutor ID:", tutorId);
      const tutorData = await apiClient.get(`/tutors/${tutorId}`);

      console.log("Fetched teaching data:", tutorData);
      // Update form data with fetched data

      setFormData({
        aboutMe: tutorData.aboutMe || "",
        education: tutorData.education || "",
      });

      setInitialData({
        aboutMe: tutorData.aboutMe || "",
        education: tutorData.education || "",
      });

      const rates = {};
      const subjectIds = [];

      if (tutorData.subjects) {
        tutorData.subjects.forEach((subj) => {
          subjectIds.push(subj.id);
          rates[subj.id] = subj.TutorSubject.hourlyRate || 45;
        });
      }
      
      setSubjectValue(subjectIds);
      setSubjectRates(rates);
      setInitialSubjectRates({...rates});
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
      // fetch all subjects
      const subjects = await apiClient.get("/tutors/subjects/all");

      console.log("Subjects received:", subjects);

      // Convert subjects to dropdown format
      const dropdownItems = subjects.map((subject) => ({
        label: `${subject.name} - ${subject.gradeLevel || "All levels"}`,
        value: subject.id,
        gradeLevel: subject.gradeLevel || "All levels",
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
    // if subject rate field
    if (field.startsWith('rate-')) {
      const subjectId = field.replace('rate-', '');

      // Validate the rate
      const error = validateHourlyRate(value);
      if (error) {
        setErrors((prev) => ({
          ...prev,
          [subjectId]: error,
        }));
      } else {
        setErrors((prev) => {
          const newErrors = {...prev};
          delete newErrors[subjectId];
          return newErrors;
        });
      }

      setSubjectRates((prev) => ({ 
        ...prev, 
        [subjectId]: value }));
    } else {
      // Handle regular form fields
      setFormData((prev) => ({ 
        ...prev, 
        [field]: value }));
    }
  };


  const handleSubjectSelection = (selectedSubjects) => {
    console.log("Selected subjects from dropdown:", selectedSubjects);

    if (!selectedSubjects) return;
      
      const subjectsArray = Array.isArray(selectedSubjects) 
        ? selectedSubjects 
        : [selectedSubjects];
      
      console.log("Processed subject IDs:", subjectsArray);

      // Add default rate for newly selected subjects
      const newRates = {...subjectRates};
      subjectsArray.forEach(subjectId => {
        if (!newRates[subjectId]) {
          newRates[subjectId] = 45; 
        }
      });

      // Remove rates for deselected subjects
      Object.keys(newRates).forEach(subjectId => {
        if (!subjectsArray.includes(subjectId)) {
          delete newRates[subjectId];
        }
      });
      
      setSubjectRates(newRates);
    };

  const handleSave = async () => {
    setErrors({}); // clear prev errors

    const rateErrors = {};
    let hasErrors = false;

    // validate hourlyRate field
    Object.entries(subjectRates).forEach(([subjectId, rate]) => {
      const error = validateHourlyRate(rate);
      if (error) {
        rateErrors[subjectId] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(rateErrors);
      Alert.alert("Error", "Please fix rate errors before saving.");
      return;
    }

    try {
      // prepare only changed fields
      const changedFields = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== initialData[key]) {
          changedFields[key] = formData[key];
        }
      });
      let subjectsChanged = false;

      // Create normalized maps for comparison
      const initialMap = new Map();
      Object.entries(initialSubjectRates).forEach(([id, rate]) => {
        if (id) {
        initialMap.set(id, Number(rate)); // Convert to number
        }
      });

      const currentMap = new Map();
      subjectValue.forEach(id => {
        if (id) {
        currentMap.set(id, Number(subjectRates[id])); // Convert to number
        }
      });

      // Check if maps are different
      if (initialMap.size !== currentMap.size) {
        subjectsChanged = true;
      } else {
        // Check each entry
        for (const [id, rate] of initialMap) {
          if (!currentMap.has(id) || currentMap.get(id) !== rate) {
            subjectsChanged = true;
            break;
          }
        }
      }

      // only send if there are changes
      if (Object.keys(changedFields).length === 0 && !subjectsChanged) {
        Alert.alert("No changes detected.");
        return;
      }

      // update tutor_subjects table
      const subjectsToUpdate = subjectValue
      .filter(subjectId => subjectId) // Filter out undefined/null values
      .map((subjectId) => ({
        subjectId: subjectId,
        hourlyRate: parseInt(subjectRates[subjectId]) || 45,
        experienceLevel: "intermediate",
      }));
      // Wrap data in tutorData object as expected by API
      const requestBody = {
        tutorData: changedFields,
        subjects: subjectsToUpdate, 
        };

      const tutorId = currentUserId || id;
      console.log("Saving tutor data for ID:", tutorId);
      console.log("Teaching data to save:", requestBody);

      await apiClient.patch(`/tutors/${tutorId}`, requestBody);

      console.log("Teaching info updated successfully");
      Alert.alert("Success", "Teaching Info updated successfully");
    } catch (error) {
      console.error("Error updating teaching info:", error);
      Alert.alert("Error", "An error occurred while updating Teaching Info");
    }
  };

  const getSubjectName = (subjectId) => {
    const subject = subjectItems.find(item => item.value === subjectId);
    return subject ? subject.label : `Subject ${subjectId}`;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView>
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
              onChangeValue={handleSubjectSelection}
              setItems={setSubjectItems}
              multiple={true}
              mode="BADGE"
              listMode="SCROLLVIEW"
              badgeDotColors={[
                "#6155F5",
                "#e76f51",
                "#e9c46a",
                "#2a9d8f",
                "#264653",
              ]}
              placeholder="Select subjects you teach"
              style={[styles.input, styles.dropdownStyle]}
              dropDownContainerStyle={styles.dropdown}
              textStyle={styles.dropdownText}
              selectedItemLabelStyle={styles.selectedItemText}
            />
            {/*Hourly Rate */}
            {subjectValue.length > 0 && (
              <View style={styles.ratesContainer}>
                <Text style={styles.subTitle}>Hourly Rates per Subject</Text>
                {subjectValue.map((subjectId) => (
                  <View key={subjectId} style={styles.rateInputContainer}>
                    <Text style={styles.subjectName}>
                      {getSubjectName(subjectId)}
                    </Text>
                    <View style={styles.rateInputRow}>
                      <Ionicons name="cash-outline" size={20} style={styles.rateIcon} />
                      <TextInput
                        style={[
                          styles.rateInput,
                          errors[subjectId] && styles.inputError,
                        ]}
                        placeholder="Hourly Rate"
                        value={String(subjectRates[subjectId] || "")}
                        onChangeText={(text) => handleInputChange(`rate-${subjectId}`, text)}
                        keyboardType="numeric"
                      />
                    </View>
                    {errors[subjectId] && (
                      <Text style={styles.errorText}>{errors[subjectId]}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Save Button */}
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
    borderWidth: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownText: {
    fontSize: 14,
  },
  selectedItemText: {
    color: "#6155F5",
    fontWeight: "bold",
  },
  dropdownStyle: {
    borderWidth: 0, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, 
    shadowRadius: 4,     
    elevation: 5,
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 10,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
    ratesContainer: {
    marginTop: 20,
  },
  rateInputContainer: {
    marginBottom: 15,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#374151",
  },
  rateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  rateIcon: {
    position: "absolute",
    left: 10,
    zIndex: 1,
    color: "#6B7280",
  },
  rateInput: {
    height: 50,
    paddingLeft: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#374151",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
    flex: 1,
  },
});
