import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";
import apiClient from "../services/apiClient";
import lessonService from "../services/lessonService";
import authService from "../services/authService";
import { paymentSuccessStyles as styles } from "./styles/paymentSuccessStyles";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { lessonId, lessonTitle, totalAmount, paymentIntentId } =
    useLocalSearchParams();

  const [confirmingEnrollment, setConfirmingEnrollment] = useState(true);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  useEffect(() => {
    // Confirm the payment and complete enrollment
    confirmPaymentAndEnroll();
  }, []);

  const confirmPaymentAndEnroll = async () => {
    try {
      setConfirmingEnrollment(true);

      // Get current user authentication
      await apiClient.loadTokenFromStorage();
      const token = await authService.getCurrentToken();

      if (!token) {
        throw new Error("Authentication required");
      }

      // Decode JWT token to get user ID
      const payload = jwtDecode(token);
      const userId = payload.userId;

      console.log(
        `🎓 Enrolling student ${userId} in lesson ${lessonId} after payment`
      );

      // Enroll student in lesson using existing business logic
      await lessonService.enrollStudentInLesson(userId, lessonId);

      console.log("✅ Enrollment successful after payment");
      setEnrollmentSuccess(true);
    } catch (error) {
      console.error("❌ Error confirming enrollment after payment:", error);

      // Handle specific enrollment errors with user-friendly messages
      const errorMessage =
        error.response?.data?.message || error.message || "Unknown error";

      if (errorMessage.toLowerCase().includes("already enrolled")) {
        console.log("ℹ️ Student already enrolled, treating as success");
        setEnrollmentSuccess(true); // If already enrolled, treat as success
      } else if (errorMessage.toLowerCase().includes("time clash")) {
        console.log("⚠️ Time clash detected during enrollment");
        setEnrollmentSuccess(false);
      } else if (errorMessage.toLowerCase().includes("grade level")) {
        console.log("⚠️ Grade level mismatch during enrollment");
        setEnrollmentSuccess(false);
      } else if (errorMessage.toLowerCase().includes("lesson is full")) {
        console.log("⚠️ Lesson capacity exceeded during enrollment");
        setEnrollmentSuccess(false);
      } else {
        console.log("❌ General enrollment error:", errorMessage);
        setEnrollmentSuccess(false);
      }
    } finally {
      setConfirmingEnrollment(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (confirmingEnrollment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6155F5" />
          <Text style={styles.loadingText}>Completing enrollment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={enrollmentSuccess ? "checkmark-circle" : "close-circle"}
            size={100}
            color={enrollmentSuccess ? "#28a745" : "#dc3545"}
          />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>
          {enrollmentSuccess ? "Payment Successful!" : "Enrollment Failed"}
        </Text>

        <Text style={styles.subtitle}>
          {enrollmentSuccess
            ? "You have been successfully enrolled in the lesson."
            : "There was an issue completing your enrollment. Please contact support."}
        </Text>

        {/* Lesson Details */}
        {enrollmentSuccess && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Enrollment Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lesson:</Text>
              <Text style={styles.detailValue}>{lessonTitle}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Paid:</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, styles.successText]}>
                Enrolled
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {enrollmentSuccess ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/tabs/studentTimetable")}
              >
                <Text style={styles.primaryButtonText}>View My Timetable</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/tabs/lessons")}
              >
                <Text style={styles.secondaryButtonText}>
                  Browse More Lessons
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/tabs/lessons")}
            >
              <Text style={styles.primaryButtonText}>Back to Lessons</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Home Button */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/tabs/myProfile")}
        >
          <Ionicons name="home-outline" size={20} color="#6155F5" />
          <Text style={styles.homeButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
