import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import Form from "../../components/form";
import { Link, useLocalSearchParams, router } from "expo-router";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateDateOfBirth,
} from "../utils/validation";
import { jwtDecode } from "jwt-decode";
import supabase from "../../services/supabaseClient";

const RESEND_SECONDS = 60;

export default function PersonalDetails() {
  const { id } = useLocalSearchParams();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null); // To track original data for changes

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // verification display + resend cooldown
  const [isActive, setIsActive] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTutorData();
    return () => stopCooldown();
  }, []);

  const startCooldown = () => {
    stopCooldown();
    setSecondsLeft(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const stopCooldown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

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

      // Prefer pendingEmail if present so the new email shows immediately
      const displayEmail = tutorData.pendingEmail || tutorData.email || "";

      // Update form data with fetched data
      setFormData({
        firstName: tutorData.firstName || "",
        lastName: tutorData.lastName || "",
        dateOfBirth: tutorData.dateOfBirth || "",
        email: displayEmail,
        phone: tutorData.phone || "",
        image: tutorData.image || "",
      });

      setInitialData({
        firstName: tutorData.firstName || "",
        lastName: tutorData.lastName || "",
        dateOfBirth: tutorData.dateOfBirth || "",
        email: displayEmail,
        phone: tutorData.phone || "",
        image: tutorData.image || "",
      });

      setIsActive(Boolean(tutorData.isActive));
      setSecondsLeft(0);
    } catch (error) {
      console.error("Error fetching tutor data:", error);
      Alert.alert("Error", "An error occurred while fetching data");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !formData || !initialData) {
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
    setErrors({}); //clear prev errors

    //validate fields
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone);
    const firstNameError = validateName(formData.firstName);
    const lastNameError = validateName(formData.lastName);
    const dateOfBirthError = validateDateOfBirth(formData.dateOfBirth);

    if (
      emailError ||
      phoneError ||
      firstNameError ||
      lastNameError ||
      dateOfBirthError
    ) {
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
    if (imageUrl && imageUrl.startsWith("file://")) {
      try {
        const imageExt = imageUrl.split(".").pop();

        let contentType = "image/png"; // default
        if (imageExt === "jpg" || imageExt === "jpeg") {
          contentType = "image/jpeg";
        } else if (imageExt === "png") {
          contentType = "image/png";
        } // add more types as needed

        const fileName = `tutor_${currentUserId || id}`;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const { data, error } = await supabase.storage
          .from("avatars")
          .upload(fileName, arrayBuffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: contentType, // sets the correct MIME type,
          });
        console.log("Supabase upload response:", data, error);
        if (error) {
          throw new Error("Image upload failed: " + error.message);
        }
        // Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
        console.log("Image public URL:", imageUrl);
        // Do NOT rely on setFormData here, just use imageUrl for PATCH
      } catch (err) {
        Alert.alert("Error", "Image upload failed: " + err.message);
        return;
      }
    }

    try {
      // Prepare only changed fields
      const changedFields = {};
      Object.keys(formData).forEach((key) => {
        // If a new image was uploaded, always set image field
        if (key === "image" && imageUrl && imageUrl.startsWith("http")) {
          changedFields[key] = imageUrl;
        } else if (formData[key] !== initialData[key] && key !== "image") {
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

      const res = await apiClient.patch(`/tutors/${tutorId}`, requestBody);

      console.log("✅ Personal details updated successfully", res);

      // If email was changed → verification flow triggered (backend mirrors student logic)
      if (res?.requiresEmailVerification && changedFields.email) {
        // Flip UI immediately to "not verified" and keep the edited email
        setIsActive(false);
        setInitialData((prev) => ({ ...prev, email: changedFields.email }));
        startCooldown();
        Alert.alert(
          "Verify your new email",
          "We’ve sent a verification link to your new address."
        );
        return;
      }

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

  const canResend = secondsLeft === 0;

  const handleResend = async () => {
    if (!formData?.email) return;
    if (!canResend) return;
    try {
      await authService.resendVerification(String(formData.email));
      Alert.alert(
        "Email sent",
        "If your account is unverified, we've sent a new verification email."
      );
      startCooldown();
    } catch (e) {
      Alert.alert("Failed to resend. Try again later.");
    }
  };

  const emailChanged = formData.email !== initialData.email;
  const renderBelowEmail = (
    <View style={{ marginTop: 8 }}>
      {emailChanged ? (
        <View style={styles.statusRow}>
          <Ionicons name="alert-circle" size={18} color="#F59E0B" />
          <Text style={styles.statusTextWarn}>
            Will require verification after you save
          </Text>
        </View>
      ) : isActive ? (
        <View style={styles.verifiedPill}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.verifiedPillText}>Email verified</Text>
        </View>
      ) : (
        <View style={styles.statusRowBetween}>
          <View style={styles.statusRow}>
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.statusTextError}>Email not verified</Text>
          </View>

          {/* Actions: Resend + Refresh status */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend}
              style={styles.resendLink}
            >
              <Text style={styles.resendLinkText}>
                {canResend ? "Resend" : `Resend in ${secondsLeft}s`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={fetchTutorData}>
              <Text style={styles.refreshLinkText}>Refresh status</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
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
        <ScrollView>
          <Form
            formData={formData}
            onInputChange={handleInputChange}
            onSave={handleSave}
            showGradeLevel={false}
            showGender={false}
            saveButtonText="Save"
            errors={errors}
            renderBelowEmail={renderBelowEmail} // ⬅️ important
          />
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
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  // Verification UI (matched to student flow)
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusTextWarn: { color: "#F59E0B", fontSize: 13, fontWeight: "600" },
  statusTextError: { color: "#EF4444", fontSize: 13, fontWeight: "600" },

  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  verifiedPillText: { color: "#065F46", fontSize: 12, fontWeight: "700" },

  resendLink: { paddingVertical: 6, paddingHorizontal: 10 },
  resendLinkText: { color: "#111827", fontWeight: "700", fontSize: 13 },

  // Added for the refresh text link
  refreshLinkText: { color: "#2563EB", fontWeight: "700", fontSize: 13, textDecorationLine: "underline" },
});
