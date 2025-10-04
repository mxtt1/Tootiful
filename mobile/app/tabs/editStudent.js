import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { validateName, validateEmail, validatePhone, validateDateOfBirth } from "../utils/validation";
import { jwtDecode } from "jwt-decode";
import supabase from "../../services/supabaseClient";

export default function editStudent() {
  const { id } = useLocalSearchParams();

  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null); // To track original data for changes
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [errors, setErrors] = useState({});

  // Email verification UI state
  const [isActive, setIsActive] = useState(true);
  const [polling, setPolling] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const pollRef = React.useRef(null);

  // NEW: resend cooldown state (60s)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const cooldownRef = React.useRef(null);

  useEffect(() => {
    fetchStudentData();
    // cleanup any timers if you navigate away
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, []);

  // NEW: tick down the resend cooldown
  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendSecondsLeft((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, [resendSecondsLeft]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Get the authenticated user's ID
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

      // Prefer pendingEmail for display so the new email shows immediately
      const displayEmail = studentData.pendingEmail || studentData.email || "";

      // Update form data with fetched data
      setFormData({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        dateOfBirth: studentData.dateOfBirth || "",
        email: displayEmail,
        phone: studentData.phone || "",
        gender: studentData.gender || "",
        gradeLevel: studentData.gradeLevel || "",
        image: studentData.image || "",
      });
      setIsActive(!!studentData.isActive);

      setInitialData({
        firstName: studentData.firstName || "",
        lastName: studentData.lastName || "",
        dateOfBirth: studentData.dateOfBirth || "",
        email: displayEmail, // baseline matches what's displayed
        phone: studentData.phone || "",
        gender: studentData.gender || "",
        gradeLevel: studentData.gradeLevel || "",
        image: studentData.image || "",
      });
    } catch (error) {
      console.error("Error fetching student data:", error);
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
    if (field === "firstName" || field === "lastName") {
      error = validateName(value);
    } else if (field === "email") {
      error = validateEmail(value);
    } else if (field === "phone") {
      error = validatePhone(value);
    } else if (field === "dateOfBirth") {
      error = validateDateOfBirth(value);
    }
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSave = async () => {
    setErrors({}); // clear prev errors

    // validate fields
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
    let imageUploaded = false;
    if (imageUrl && imageUrl.startsWith("file://")) {
      try {
        const imageExt = imageUrl.split(".").pop();

        let contentType = "image/png"; // default
        if (imageExt === "jpg" || imageExt === "jpeg") {
          contentType = "image/jpeg";
        } else if (imageExt === "png") {
          contentType = "image/png";
        } // add more types as needed

        const fileName = `student_${currentUserId || id}`;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const { data, error } = await supabase.storage.from("avatars").upload(fileName, arrayBuffer, {
          cacheControl: "3600",
          upsert: true,
          contentType: contentType, // sets the correct MIME type
        });
        console.log("Supabase upload response:", data, error);
        if (error) {
          throw new Error("Image upload failed: " + error.message);
        }
        // Get public URL
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
        imageUploaded = true;
        console.log("Image public URL:", imageUrl);
        // Do NOT rely on setFormData here, just use imageUrl for PATCH
      } catch (err) {
        Alert.alert("Error", "Image upload failed: " + err.message);
        return;
      }
    }

    try {
      const requestBody = {};
      Object.keys(formData).forEach((key) => {
        // If a new image was uploaded, always set image field
        if (key === "image" && imageUploaded) {
          requestBody[key] = imageUrl;
        } else if (formData[key] !== initialData[key] && key !== "image") {
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

      // Immediately refresh so we pick up isActive=false and pendingEmail if email changed
      await fetchStudentData();

      console.log("✅ Personal details updated successfully");
      Alert.alert(
        "Success",
        "Personal details updated successfully! Go back to profile?",
        [
          { text: "Stay Here", style: "cancel" },
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
      Alert.alert("Error", "An error occurred while updating profile. Please try again.");
    }
  };

  // ----- Email verification helpers -----
  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
    setSecondsLeft(90);
  };

  const startPollingForVerification = (studentId) => {
    stopPolling();
    setPolling(true);
    setSecondsLeft(90);
    pollRef.current = setInterval(async () => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      try {
        const fresh = await apiClient.get(`/students/${studentId}`);
        if (fresh?.isActive) {
          stopPolling();
          setIsActive(true);
          Alert.alert("Verified!", "Your email is now verified.");
          // pull the final official email (DB value)
          await fetchStudentData();
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 3000);

    // hard stop after 90s
    setTimeout(() => {
      if (pollRef.current) {
        stopPolling();
      }
    }, 90000);
  };

  const onPressVerify = async () => {
    try {
      await authService.resendVerification(); // backend uses auth to target correct address
      setResendSecondsLeft(60);               // <<< start 60s cooldown
      Alert.alert("Verification sent", "Check your inbox for the verification link.");
      const studentId = currentUserId || id;
      startPollingForVerification(studentId);
    } catch (e) {
      const msg = e?.message || "We couldn't send the verification email. Please try again.";
      Alert.alert("Failed to send", msg);
    }
  };

  // render content right under the Email field
  const renderBelowEmail = () => {
    if (!formData?.email) return null;

    if (isActive) {
      return (
        <View style={[styles.verifyRow, { marginTop: 6 }]}>
          <Ionicons name="checkmark-circle" size={18} color="green" />
          <Text style={styles.verifiedText}>Email verified</Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 6 }}>
        <View style={styles.verifyRow}>
          <Ionicons name="warning-outline" size={18} color="#E67E22" />
          <Text style={styles.unverifiedText}>Email not verified</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onPressVerify}
            disabled={polling || resendSecondsLeft > 0}                    // <<< disable during cooldown
            style={({ pressed }) => [
              styles.verifyButton,
              { opacity: (polling || resendSecondsLeft > 0) ? 0.6 : pressed ? 0.8 : 1 },
            ]}
          >
            {polling ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.verifyButtonText}>
                {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : "Resend Verification"}
              </Text>
            )}
          </Pressable>

          {polling ? (
            <Text style={styles.waitingText}>Waiting… {secondsLeft}s</Text>
          ) : (
            <Pressable onPress={fetchStudentData}>
              <Text style={styles.refreshText}>Refresh status</Text>
            </Pressable>
          )}

          {/* Removed the Stop button for minimal UX as requested */}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
        errors={errors}
        /** status/verify row lives directly under the Email field */
        renderBelowEmail={renderBelowEmail}
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
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  // --- verify UI ---
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifiedText: {
    color: "green",
    fontWeight: "600",
    marginLeft: 6,
  },
  unverifiedText: {
    color: "#E67E22",
    fontWeight: "600",
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: "white",
    fontWeight: "600",
  },
  waitingText: {
    color: "#333",
  },
  refreshText: {
    color: "#2563EB",
    textDecorationLine: "underline",
  },
  stopText: {
    color: "#666",
    textDecorationLine: "underline",
  },
});
