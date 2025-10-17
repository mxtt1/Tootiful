import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../services/apiClient";
import authService from "../services/authService";
import lessonService from "../services/lessonService";
import { paymentStyles as styles } from "./styles/paymentStyles";

export default function PaymentPage() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams();
  const { confirmPayment } = useStripe();

  // State management
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cardValid, setCardValid] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    if (lessonId) {
      fetchPaymentDetails();
    }
  }, [lessonId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);

      // Check authentication
      if (!authService.isAuthenticated()) {
        Alert.alert("Error", "Please log in to continue");
        router.back();
        return;
      }

      // Fetch payment calculation
      const response = await apiClient.get(`/payments/calculate/${lessonId}`);
      setPaymentDetails(response.data);

      // Create payment intent
      const intentResponse = await apiClient.post("/payments/create-intent", {
        lessonId: lessonId,
      });
      setClientSecret(intentResponse.data.clientSecret);
    } catch (error) {
      console.error("Error fetching payment details:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load payment details",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!clientSecret || !cardValid) {
      Alert.alert("Error", "Please enter valid card details");
      return;
    }

    try {
      setProcessing(true);

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        console.error("Payment error:", error);
        Alert.alert("Payment Failed", error.message);
      } else {
        // Payment successful - create student payment record
        try {
          await lessonService.createStudentPayment({
            lessonId: lessonId,
            amount: paymentDetails?.totalAmount,
          });
        } catch (err) {
          console.error("Error creating student payment record:", err);
          // Optionally alert, but continue to success page
        }
        // Redirect to success page
        router.replace({
          pathname: "/payment-success",
          params: {
            lessonId: lessonId,
            lessonTitle: paymentDetails?.lessonTitle,
            totalAmount: paymentDetails?.totalAmount,
            paymentIntentId: clientSecret?.split("_secret")[0], // Extract payment intent ID
          },
        });
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      Alert.alert("Error", "Payment processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6155F5" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load payment details</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIcon}
          >
            <Ionicons name="arrow-back" size={24} color="#6155F5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
        </View>

        {/* Lesson Details Card */}
        <View style={styles.lessonCard}>
          <Text style={styles.lessonTitle}>{paymentDetails.lessonTitle}</Text>
          <View style={styles.lessonDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="book-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {paymentDetails.lesson.subject}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {paymentDetails.lesson.tutor}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {paymentDetails.lesson.dayOfWeek.charAt(0).toUpperCase() +
                  paymentDetails.lesson.dayOfWeek.slice(1)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {formatTime(paymentDetails.lesson.startTime)} -{" "}
                {formatTime(paymentDetails.lesson.endTime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Lesson Fee</Text>
            <Text style={styles.feeAmount}>
              {formatCurrency(paymentDetails.lessonFee)}
            </Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>
              Platform Fee ({paymentDetails.platformFeePercentage}%)
            </Text>
            <Text style={styles.feeAmount}>
              {formatCurrency(paymentDetails.platformFee)}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(paymentDetails.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Card Input */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <CardField
            postalCodeEnabled={false}
            placeholders={{
              number: "4242 4242 4242 4242",
            }}
            style={styles.cardFieldContainer}
            onCardChange={(cardDetails) => {
              setCardValid(cardDetails.complete);
            }}
          />
          <Text style={styles.testCardNote}>
            💡 Use test card: 4242 4242 4242 4242, any future date, any CVC
          </Text>
        </View>

        {/* Payment Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            (!cardValid || processing) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!cardValid || processing}
        >
          {processing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay {formatCurrency(paymentDetails.totalAmount)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
