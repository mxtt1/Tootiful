import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { agenciesStyles as styles } from "../styles/agenciesStyles";
import agencyService from "../../services/agencyService";

export default function AgenciesScreen() {
  const [agencies, setAgencies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const AGENCIES_PER_PAGE = 4;

  // Filter dropdown states
  const [dropdownVisible, setDropdownVisible] = useState({
    location: false,
  });

  // Filter states
  const [filters, setFilters] = useState({
    location: "all",
  });

  // Refresh data when user returns to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔄 Agencies screen focused - refreshing data");
      fetchAgencies();
      fetchLocations();
    }, [])
  );

  // Filter and paginate agencies
  const { paginatedAgencies, totalPages, totalAgencies } = useMemo(() => {
    console.log("🔍 Filtering agencies...", {
      searchQuery,
      selectedLocation: filters.location,
      agenciesCount: agencies.length,
    });

    let filtered = [...agencies];

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter((agency) => {
        try {
          return (
            agency.name?.toLowerCase().includes(searchLower) ||
            agency.email?.toLowerCase().includes(searchLower) ||
            (agency.aboutUs &&
              agency.aboutUs.toLowerCase().includes(searchLower))
          );
        } catch (error) {
          console.warn("⚠️ Error filtering agency by search:", error.message);
          return false;
        }
      });
    }

    // Filter by location
    if (filters.location !== "all") {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter((agency) => {
        try {
          if (
            !agency.locations ||
            !Array.isArray(agency.locations) ||
            agency.locations.length === 0
          ) {
            return false;
          }
          return agency.locations.some((location) => {
            try {
              return (
                location?.address &&
                typeof location.address === "string" &&
                location.address.toLowerCase().includes(locationLower)
              );
            } catch (error) {
              console.warn("⚠️ Error checking location:", error.message);
              return false;
            }
          });
        } catch (error) {
          console.warn("⚠️ Error filtering agency by location:", error.message);
          return false;
        }
      });
    }

    // Calculate pagination
    const totalAgencies = filtered.length;
    const totalPages = Math.ceil(totalAgencies / AGENCIES_PER_PAGE);
    const startIndex = (currentPage - 1) * AGENCIES_PER_PAGE;
    const endIndex = startIndex + AGENCIES_PER_PAGE;
    const paginatedAgencies = filtered.slice(startIndex, endIndex);

    console.log(
      `✅ Filtered to ${totalAgencies} agencies, showing page ${currentPage}/${totalPages} (${paginatedAgencies.length} agencies)`
    );

    return {
      paginatedAgencies,
      totalPages,
      totalAgencies,
    };
  }, [searchQuery, filters.location, agencies, currentPage, AGENCIES_PER_PAGE]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Fetching agencies...");
      const response = await agencyService.getAllActiveAgencies();

      // Transform API data to match component expectations
      const agenciesData = response.data || [];

      setAgencies(agenciesData);
      console.log(`✅ Loaded ${agenciesData.length} agencies`);
    } catch (error) {
      console.error("❌ Failed to fetch agencies:", error.message);
      setError("Failed to load agencies. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchLocations = async () => {
    try {
      console.log("🔄 Fetching locations...");
      const response = await agencyService.getAllLocations();
      const locationsData = response.data || [];
      setLocations(locationsData);
      console.log(`✅ Loaded ${locationsData.length} locations`);
    } catch (error) {
      console.error("❌ Failed to fetch locations:", error.message);
      // Don't show error for locations as it's not critical
    }
  };

  const handleAgencyPress = useCallback(
    (agency) => {
      // Navigate to agency details screen
      router.push(`/agencyDetails?id=${agency.id}`);
    },
    [router]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAgencies();
    fetchLocations();
  }, []);

  const getAgencyInitials = useCallback((name) => {
    if (!name || typeof name !== "string") return "AG";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  const toggleDropdown = useCallback((category) => {
    setDropdownVisible((prev) => ({
      location: false,
      [category]: !prev[category],
    }));
  }, []);

  const selectFilter = useCallback((category, value) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "all" : value,
    }));
    setDropdownVisible((prev) => ({
      ...prev,
      [category]: false,
    }));
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setDropdownVisible({
      location: false,
    });
  }, []);

  // Pagination functions
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading agencies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAgencies}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeAllDropdowns}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tutoring Agencies</Text>
            <Text style={styles.headerSubtitle}>
              {totalAgencies > 0
                ? `Found ${totalAgencies} agencies`
                : "Discover verified tutoring agencies"}
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search agencies..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Filter Dropdowns */}
          <View style={styles.filtersContainer}>
            <View style={styles.dropdownsRow}>
              {/* Location Dropdown */}
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    filters.location !== "all" && styles.dropdownButtonActive,
                  ]}
                  onPress={() => toggleDropdown("location")}
                >
                  <Text
                    style={[
                      styles.dropdownButtonText,
                      filters.location !== "all" &&
                        styles.dropdownButtonTextActive,
                    ]}
                  >
                    {filters.location !== "all" ? filters.location : "Location"}
                  </Text>
                  <Ionicons
                    name={
                      dropdownVisible.location ? "chevron-up" : "chevron-down"
                    }
                    size={16}
                    color={filters.location !== "all" ? "#8B5CF6" : "#666"}
                  />
                </TouchableOpacity>
                {dropdownVisible.location && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("location", "all")}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.location === "all" &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        All Locations
                      </Text>
                    </TouchableOpacity>
                    {locations.map((location, index) => (
                      <TouchableOpacity
                        key={`${location}-${index}`}
                        style={styles.dropdownItem}
                        onPress={() => selectFilter("location", location)}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            filters.location === location &&
                              styles.dropdownItemTextActive,
                          ]}
                        >
                          {location}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Agencies Grid */}
          <ScrollView
            style={styles.agenciesList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#8B5CF6"]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.agenciesGrid}>
              {paginatedAgencies.map((agency) => (
                <TouchableOpacity
                  key={agency.id}
                  style={styles.agencyGridCard}
                  onPress={() => handleAgencyPress(agency)}
                >
                  <View style={styles.agencyGridImageContainer}>
                    {agency.image ? (
                      <Image
                        source={{ uri: agency.image }}
                        style={styles.agencyGridImage}
                        onError={(e) =>
                          console.log("Image failed to load:", agency.image)
                        }
                      />
                    ) : (
                      <View style={styles.agencyGridImagePlaceholder}>
                        <Text style={styles.agencyGridImageText}>
                          {getAgencyInitials(agency.name)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.agencyGridInfo}>
                    <Text style={styles.agencyGridName} numberOfLines={1}>
                      {agency.name}
                    </Text>
                    <Text style={styles.agencyGridEmail} numberOfLines={1}>
                      {agency.email}
                    </Text>
                  </View>

                  {/* About Us Section */}
                  {agency.aboutUs && (
                    <View style={styles.agencyGridDescription}>
                      <Text
                        style={styles.agencyGridDescriptionText}
                        numberOfLines={2}
                      >
                        {agency.aboutUs}
                      </Text>
                    </View>
                  )}

                  {/* View Details Button */}
                  <TouchableOpacity
                    style={styles.agencyGridViewButton}
                    onPress={() => handleAgencyPress(agency)}
                  >
                    <Text style={styles.agencyGridViewButtonText}>View</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>

            {totalAgencies === 0 && !loading && (
              <View style={styles.noResultsContainer}>
                <Ionicons name="business" size={64} color="#D1D5DB" />
                <Text style={styles.noResultsText}>No agencies found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try searching with different keywords or check back later for
                  new agencies
                </Text>
              </View>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {(currentPage - 1) * AGENCIES_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * AGENCIES_PER_PAGE, totalAgencies)} of{" "}
                  {totalAgencies} agencies
                </Text>

                <View style={styles.paginationControls}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === 1 && styles.paginationButtonDisabled,
                    ]}
                    onPress={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={currentPage === 1 ? "#ccc" : "#8B5CF6"}
                    />
                  </TouchableOpacity>

                  <View style={styles.pageNumbers}>
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNumber = index + 1;
                      const isCurrentPage = pageNumber === currentPage;

                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        Math.abs(pageNumber - currentPage) <= 1;

                      if (!showPage) {
                        // Show ellipsis for gaps
                        if (pageNumber === 2 && currentPage > 4) {
                          return (
                            <Text
                              key={`ellipsis-${pageNumber}`}
                              style={styles.ellipsis}
                            >
                              ...
                            </Text>
                          );
                        }
                        if (
                          pageNumber === totalPages - 1 &&
                          currentPage < totalPages - 3
                        ) {
                          return (
                            <Text
                              key={`ellipsis-${pageNumber}`}
                              style={styles.ellipsis}
                            >
                              ...
                            </Text>
                          );
                        }
                        return null;
                      }

                      return (
                        <TouchableOpacity
                          key={pageNumber}
                          style={[
                            styles.pageButton,
                            isCurrentPage && styles.pageButtonActive,
                          ]}
                          onPress={() => goToPage(pageNumber)}
                        >
                          <Text
                            style={[
                              styles.pageButtonText,
                              isCurrentPage && styles.pageButtonTextActive,
                            ]}
                          >
                            {pageNumber}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === totalPages &&
                        styles.paginationButtonDisabled,
                    ]}
                    onPress={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={currentPage === totalPages ? "#ccc" : "#8B5CF6"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
