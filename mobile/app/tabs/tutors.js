import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { tutorsStyles as styles } from "../styles/tutorsStyles";
import tutorService from "../../services/tutorService";

export default function TutorsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tutors, setTutors] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tutors from API on component mount
  useEffect(() => {
    fetchTutors();
  }, []);

  // Refresh data when user returns to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔄 All tutors screen focused - refreshing data");
      fetchTutors();
    }, [])
  );

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Fetching tutors from API...");
      // Try to fetch from API first
      const response = await tutorService.getAllTutors({
        active: true,
        limit: 50, // Get more tutors for better demo
      });

      console.log("✅ Raw API response:", response);

      // Transform API data to match component expectations
      const apiTutors = response.data.map((tutor) => ({
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        email: tutor.email,
        phone: tutor.phone,
        image: tutor.image,
        education: tutor.education || "University Graduate",
        dateOfBirth: tutor.dateOfBirth || "1990-01-01",
        subjects: tutor.subjects.map((subject) => ({
          name: subject.name,
          experienceLevel: subject.TutorSubject.experienceLevel,
        })),
        // rating: 4.5, // Mock rating since not in API yet
        // totalReviews: Math.floor(Math.random() * 50) + 10, // Mock reviews
        // isOnline: Math.random() > 0.3, // Mock online status
      }));

      console.log(
        "Tutor images:",
        apiTutors.map((t) => ({
          name: `${t.firstName} ${t.lastName}`,
          hasImage: !!t.image,
          imageUrl: t.image,
        }))
      );

      setTutors(apiTutors);
      setFilteredTutors(apiTutors);
      console.log("✅ Fetched tutors from API:", apiTutors.length, "tutors");
    } catch (error) {
      console.error("❌ API call failed with details:", {
        message: error.message,
        status: error.status,
        stack: error.stack,
        error: error,
      });
      console.warn("⚠️ API failed, using mock data:", error.message);
      setError("Using demo data - API not available");
      setTutors(MOCK_TUTORS);
      setFilteredTutors(MOCK_TUTORS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === "") {
      setFilteredTutors(tutors);
    } else {
      const filtered = tutors.filter(
        (tutor) =>
          tutor.firstName.toLowerCase().includes(text.toLowerCase()) ||
          tutor.lastName.toLowerCase().includes(text.toLowerCase()) ||
          tutor.subjects.some((subject) =>
            subject.name.toLowerCase().includes(text.toLowerCase())
          )
      );
      setFilteredTutors(filtered);
    }
  };

  const handleTutorPress = (tutor) => {
    // Navigate to tutor profile screen for students
    router.push(`/viewTutorProfile?id=${tutor.id}`);
  };

  /* Nonfunctional: remove for now
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#F59E0B" />);
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#F59E0B" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#D1D5DB"
        />
      );
    }

    return stars;
  };
  */

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tutors or subjects..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Finding great tutors...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.tutorsList}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchTutors}
                colors={["#007bff"]}
              />
            }
          >
            {filteredTutors.map((tutor) => (
              <TouchableOpacity
                key={tutor.id}
                style={styles.tutorCard}
                onPress={() => handleTutorPress(tutor)}
              >
                <View style={styles.tutorHeader}>
                  <View style={styles.tutorImageContainer}>
                    {tutor.image ? (
                      <Image
                        source={{ uri: tutor.image + "?t=" + Date.now() }}
                        style={styles.tutorImagePlaceholder}
                        onError={(e) =>
                          console.log("Image failed to load:", tutor.image)
                        }
                      />
                    ) : (
                      <View style={styles.tutorImagePlaceholder}>
                        <Text style={styles.tutorImageText}>
                          {tutor.firstName[0]}
                          {tutor.lastName[0]}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.tutorInfo}>
                    <Text style={styles.tutorName}>
                      {tutor.firstName} {tutor.lastName}
                    </Text>

                    {/* Education and Birth Date */}
                    {tutor.education && (
                      <View style={styles.infoRow}>
                        <Ionicons name="school-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>{tutor.education}</Text>
                      </View>
                    )}
                    {tutor.dateOfBirth && (
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>
                          Born {new Date(tutor.dateOfBirth).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {/* Nonfunctional: remove for now
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(tutor.rating)}
                      </View>
                      <Text style={styles.ratingText}>
                        {tutor.rating} ({tutor.totalReviews} reviews)
                      </Text>
                    </View>
                    */}
                  </View>
                </View>

                {/* Subjects */}
                <View style={styles.subjectsContainer}>
                  <Text style={styles.subjectsLabel}>Subjects:</Text>
                  {tutor.subjects && tutor.subjects.length > 0 ? (
                    <View style={styles.subjectsTags}>
                      {tutor.subjects.map((subject, index) => (
                        <View key={index} style={styles.subjectTag}>
                          <Text style={styles.subjectTagText}>
                            {subject.name} ({subject.experienceLevel})
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noSubjectsText}>No subjects listed</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {/* Nonfunctional: remove for now 
                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#8B5CF6"
                    />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                  */}

                  <TouchableOpacity
                    style={styles.viewProfileButton}
                    onPress={() => handleTutorPress(tutor)}
                  >
                    <Text style={styles.viewProfileButtonText}>
                      View Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {filteredTutors.length === 0 && !loading && (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={64} color="#D1D5DB" />
                <Text style={styles.noResultsText}>No tutors found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try searching for different subjects or tutors
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
