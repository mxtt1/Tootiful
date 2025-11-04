import React, { useState, useEffect, useRef } from 'react';
import { Modal, TextInput, Button, Text, Alert, Card, Group, Stack, Grid, ColorSwatch, Select, ColorPicker, Textarea, SimpleGrid, Image } from "@mantine/core";
import { IconPlus, IconCheck, IconX, IconEye, IconDownload, IconRefresh, IconEdit, IconColorPicker, IconInfoCircle, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import ApiClient from "../api/apiClient";

const CustomizationComponent = () => {
    const [modalOpen, setModalOpen] = useState(false);
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [characterCount, setCharacterCount] = useState(0);
    const [extractedData, setExtractedData] = useState(null);
    const [loadingExtraction, setLoadingExtraction] = useState(false);
    const [existingCustomization, setExistingCustomization] = useState(null);
    const [selectedColor, setSelectedColor] = useState("");
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState("");
    const [agencyName, setAgencyName] = useState("");
    const [agencyDescription, setAgencyDescription] = useState("");
    const [originalAgencyData, setOriginalAgencyData] = useState(null);
    const [selectedImage, setSelectedImage] = useState("");
    const [availableImages, setAvailableImages] = useState([]);

  const MAX_DISPLAY_NAME_LENGTH = 25;
  const displayNameInputRef = useRef(null);

  // Load existing customization when component mounts
  useEffect(() => {
    loadExistingCustomization();
    
    // Listen for customization updates from other components
    const handleCustomizationUpdate = () => {
      console.log("Customization update event received - reloading data");
      loadExistingCustomization();
    };

    window.addEventListener('customizationUpdated', handleCustomizationUpdate);
    return () => window.removeEventListener('customizationUpdated', handleCustomizationUpdate);
  }, []);

  // Load data when modal opens
  useEffect(() => {
    if (modalOpen && existingCustomization) {
      populateExistingData();
    }
  }, [modalOpen, existingCustomization]);

  const loadExistingCustomization = async () => {
    try {
      console.log("Loading existing customization...");
      const response = await ApiClient.get("/agencies/customization");
      console.log("Customization API response:", response);
      
      if (response.success && response.config) {
        setExistingCustomization(response.config);
        console.log("Existing customization loaded:", response.config);
        
        // Also load agency data to show original values
        await loadAgencyData();
      } else {
        console.log("No existing customization found");
        setExistingCustomization(null);
      }
    } catch (error) {
      console.error("Failed to load existing customization:", error);
      console.error("Error details:", error.response?.data || error.message);
      setExistingCustomization(null);
    }
  };

  const loadAgencyData = async () => {
    try {
      // Assuming you have an endpoint to get agency data
      const agencyResponse = await ApiClient.get("/agency/profile");
      if (agencyResponse.success && agencyResponse.agency) {
        setOriginalAgencyData(agencyResponse.agency);
        console.log("Original agency data loaded:", agencyResponse.agency);
      }
    } catch (error) {
      console.error("Failed to load agency data:", error);
    }
  };

  const populateExistingData = () => {
    if (existingCustomization) {
      // Set website URL from existing customization
      setWebsiteUrl(existingCustomization.websiteUrl || "");
      
      // Set display name from customTheme or fallback to agency name
      const existingDisplayName = existingCustomization.customTheme?.displayName || 
                                originalAgencyData?.name || 
                                "";
      setDisplayName(existingDisplayName);
      setCharacterCount(existingDisplayName.length);
      
      // Set agency description from original data
      setAgencyDescription(originalAgencyData?.aboutUs || "");
      
      // Set colors from existing customization
      const existingColors = existingCustomization.customTheme?.colors;
      if (existingColors && existingColors.length > 0) {
        setSelectedColor(existingColors[0]);
      }
      
      // Set selected image from existing customization
      const existingImage = existingCustomization.customTheme?.selectedImage;
      if (existingImage) {
        setSelectedImage(existingImage);
      }
      
      // Set extracted data from metadata or customTheme - STORE ALL DATA
      if (existingCustomization.metadata || existingCustomization.customTheme) {
        // Combine both metadata and customTheme to show all available data
        const combinedData = {
          ...existingCustomization.metadata,
          ...existingCustomization.customTheme
        };
        setExtractedData(combinedData);
        
        // Extract available images from the data
        extractAvailableImages(combinedData);
        console.log("Combined extracted data:", combinedData);
      }
    }
  };

  const extractAvailableImages = (data) => {
    const images = [
      { key: 'displayImage', label: 'Display Image', url: data.displayImage },
      { key: 'logo', label: 'Logo', url: data.logo },
      { key: 'ogImage', label: 'Open Graph Image', url: data.ogImage },
      { key: 'twitterImage', label: 'Twitter Image', url: data.twitterImage },
      { key: 'largeIcon', label: 'Large Icon', url: data.largeIcon },
      { key: 'favicon', label: 'Favicon', url: data.favicon },
      { key: 'selectedImage', label: 'Selected Image', url: data.selectedImage },
    ].filter(img => img.url && img.url.trim() !== '');
    
    setAvailableImages(images);
    
    // If no image is selected but we have images, select the first one
    if (!selectedImage && images.length > 0) {
      setSelectedImage(images[0].url);
    }
  };

  // Manual extraction only - no auto-extract
  const handleExtractMetadata = async () => {
    if (!websiteUrl || websiteUrl.length < 10) return;
    
    setLoadingExtraction(true);
    try {
      console.log("Extracting metadata from:", websiteUrl);
      
      const extractRes = await ApiClient.post(
        "/agencies/customization/extract-metadata",
        { websiteUrl }
      );
      console.log("Full extract response:", extractRes);

      if (extractRes.metadata) {
        console.log("Metadata fields available:", Object.keys(extractRes.metadata));
        console.log("Has displayImage:", !!extractRes.metadata.displayImage);
        console.log("Has logo:", !!extractRes.metadata.logo);
        console.log("Has ogImage:", !!extractRes.metadata.ogImage);
      }

      console.log("Extract metadata response:", extractRes);

      let metadata;
      if (extractRes.data && extractRes.data.metadata) {
        metadata = extractRes.data.metadata;
      } else if (extractRes.metadata) {
        metadata = extractRes.metadata;
      } else if (extractRes.success && extractRes.metadata) {
        metadata = extractRes.metadata;
      } else {
        console.warn("Unexpected response structure:", extractRes);
        throw new Error("Unexpected response format from server");
      }

      console.log("Final metadata being set:", metadata);
      setExtractedData(metadata);
      
      // Extract available images
      extractAvailableImages(metadata);
      
      // Store ALL extracted images for later use
      if (metadata.displayImage || metadata.logo || metadata.ogImage || metadata.twitterImage || metadata.largeIcon || metadata.favicon) {
        console.log("All extracted images:", {
          displayImage: metadata.displayImage,
          logo: metadata.logo,
          ogImage: metadata.ogImage,
          twitterImage: metadata.twitterImage,
          largeIcon: metadata.largeIcon,
          favicon: metadata.favicon
        });
      }
      
      // Auto-populate display name with extracted title (can be edited)
      if (metadata.title && !displayName) {
        const title = metadata.title;
        if (title.length > MAX_DISPLAY_NAME_LENGTH) {
          notifications.show({
            title: "Title Too Long",
            message: `Website title "${title}" exceeds ${MAX_DISPLAY_NAME_LENGTH} characters. Please edit it before saving.`,
            color: "orange",
            icon: <IconX size={16} />,
          });
        }
        setDisplayName(title);
        setCharacterCount(title.length);
      } else if (!metadata.title && !displayName) {
        const domainName = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        setDisplayName(domainName);
        setCharacterCount(domainName.length);
      }
      
      // Auto-select first color if available
      if (metadata.colors && metadata.colors.length > 0) {
        setSelectedColor(metadata.colors[0]);
      } else {
        setSelectedColor('#6155F5');
      }
      
      setPreviewMode(true);
      
      notifications.show({
        title: "Success",
        message: "Website data extracted successfully!",
        color: "green",
        icon: <IconDownload size={16} />,
      });

    } catch (error) {
      console.error("Error extracting metadata:", error);
      notifications.show({
        title: "Warning",
        message: "Could not extract website data. You can still customize manually.",
        color: "yellow",
      });
    } finally {
      setLoadingExtraction(false);
    }
  };

  // Fixed input handler with focus preservation and character limit
  const handleDisplayNameChange = (e) => {
    const value = e.target.value;
    
    const cursorPosition = e.target.selectionStart;
    
    if (value.length <= MAX_DISPLAY_NAME_LENGTH) {
      setDisplayName(value);
      setCharacterCount(value.length);
    } else {
      setDisplayName(value.substring(0, MAX_DISPLAY_NAME_LENGTH));
      setCharacterCount(MAX_DISPLAY_NAME_LENGTH);
    }
    
    setTimeout(() => {
      if (displayNameInputRef.current) {
        displayNameInputRef.current.focus();
        const newCursorPosition = Math.min(cursorPosition, MAX_DISPLAY_NAME_LENGTH);
        displayNameInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Check if display name is valid for saving
  const isDisplayNameValid = () => {
    return displayName.trim().length > 0 && displayName.length <= MAX_DISPLAY_NAME_LENGTH;
  };

  // Simple website URL handler
  const handleWebsiteUrlChange = (e) => {
    setWebsiteUrl(e.target.value);
  };

  // Agency description handler
  const handleAgencyDescriptionChange = (e) => {
    setAgencyDescription(e.target.value);
  };

  // Color selection handler
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  // Handle custom color picker selection
  const handleCustomColorSelect = (color) => {
    setCustomColor(color);
    setSelectedColor(color);
  };

  // Image selection handler
  const handleImageSelect = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  // Add custom color to the available colors
  const handleAddCustomColor = () => {
    if (customColor && !extractedData?.colors?.includes(customColor)) {
      const updatedExtractedData = {
        ...extractedData,
        colors: [...(extractedData?.colors || []), customColor]
      };
      setExtractedData(updatedExtractedData);
      setSelectedColor(customColor);
      setCustomColor("");
      setShowColorPicker(false);
      
      notifications.show({
        title: "Success",
        message: "Custom color added!",
        color: "green",
      });
    }
  };

  // Reset all data to default
  const handleResetData = async () => {
    try {
      // Clear the customization
      const resetRes = await ApiClient.delete("/agencies/customization");
      
      if (resetRes.success) {
        notifications.show({
          title: "Success",
          message: "Customization reset to default!",
          color: "green",
        });
        
        // Reset all local state
        setWebsiteUrl("");
        setDisplayName("");
        setCharacterCount(0);
        setExtractedData(null);
        setSelectedColor("");
        setSelectedImage("");
        setAvailableImages([]);
        setAgencyDescription("");
        setExistingCustomization(null);
        setPreviewMode(false);
        
        // Trigger update event for ALL components
        window.dispatchEvent(new Event('customizationUpdated'));
        console.log("Customization reset and update event dispatched");
        
      } else {
        throw new Error(resetRes.message || "Failed to reset customization");
      }
    } catch (error) {
      console.error("Error resetting customization:", error);
      notifications.show({
        title: "Error",
        message: error.message || "Failed to reset customization",
        color: "red",
      });
    }
  };

  const handleUrlSubmit = async () => {
    if (!isDisplayNameValid()) {
      if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
        notifications.show({
          title: "Display Name Too Long",
          message: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less. Current: ${displayName.length} characters.`,
          color: "red",
          icon: <IconX size={16} />,
        });
      }
      return;
    }
    
    if (!displayName.trim()) return;
    
    setSubmitting(true);
    try {
      console.log("Saving customization...");

      // Use selected color as the primary color
      const colors = selectedColor ? [selectedColor] : [];

      // Store ALL extracted data including images and selected image
      const customTheme = extractedData ? {
        ...extractedData, // This includes ALL extracted data: displayImage, logo, ogImage, etc.
        displayName: displayName || extractedData.title,
        websiteUrl: websiteUrl,
        colors: colors,
        selectedImage: selectedImage, // Store the selected image
        // Preserve all image URLs
        displayImage: extractedData.displayImage,
        logo: extractedData.logo,
        ogImage: extractedData.ogImage,
        twitterImage: extractedData.twitterImage,
        largeIcon: extractedData.largeIcon,
        favicon: extractedData.favicon,
        title: extractedData.title,
        description: extractedData.description
      } : {
        title: displayName,
        displayName: displayName,
        websiteUrl: websiteUrl,
        colors: colors,
        selectedImage: selectedImage
      };

      // Store metadata separately if we have extracted data
      const metadata = extractedData ? {
        ...extractedData // Store original extracted metadata
      } : null;

      let saveRes;
      if (existingCustomization) {
        saveRes = await ApiClient.patch("/agencies/customization", {
            websiteUrl,
            customTheme,
            metadata, // Store metadata separately
            useCustomTheme: true,
            name: displayName,
            aboutUs: agencyDescription
        });
      } else {
        saveRes = await ApiClient.post("/agencies/customization", {
            websiteUrl,
            customTheme,
            metadata, // Store metadata separately
            useCustomTheme: true,
            name: displayName,
            aboutUs: agencyDescription
        });
      }

      console.log("Save customization response:", saveRes);

      if (saveRes.success) {
        notifications.show({
          title: "Success",
          message: existingCustomization ? "Branding updated successfully!" : "Customization saved successfully!",
          color: "green",
        });
        setModalOpen(false);
        
        // Trigger update event for ALL components
        window.dispatchEvent(new Event('customizationUpdated'));
        console.log("Customization update event dispatched");
        
        // Force reload to get updated data
        await loadExistingCustomization();
      } else {
        throw new Error(saveRes.message || "Failed to save customization");
      }

    } catch (error) {
      console.error("Error saving customization:", error);
      notifications.show({
        title: "Error",
        message: error.message || "Failed to save customization",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const PreviewComponent = () => {
    const primaryColor = selectedColor || existingCustomization?.customTheme?.colors?.[0] || '#6155F5';
    const previewAgencyName = displayName || existingCustomization?.customTheme?.displayName || 'Your Agency';

    // Use selected image or fallback to available images
    const logoUrl = selectedImage || 
                  extractedData?.displayImage || 
                  existingCustomization?.customTheme?.displayImage ||
                  extractedData?.logo ||
                  existingCustomization?.customTheme?.logo ||
                  extractedData?.ogImage ||
                  existingCustomization?.customTheme?.ogImage ||
                  extractedData?.largeIcon ||
                  existingCustomization?.customTheme?.largeIcon;

    return (
      <Card shadow="sm" padding="lg" style={{ border: '2px solid #e0e0e0', marginBottom: '1rem' }}>
        <Text size="lg" fw={500} mb="md">Live Preview</Text>
        
        {/* Sidebar Preview */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <Text size="sm" c="dimmed" mb="xs">Sidebar Preview:</Text>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '8px',
            padding: '16px 12px'
          }}>
            {/* Agency Logo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '8px'
          }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={previewAgencyName}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.log("Image failed to load:", logoUrl);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: primaryColor,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {previewAgencyName.charAt(0)}
              </div>
            )}
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: primaryColor,
                lineHeight: 1.1,
              }}>
                {previewAgencyName}
              </div>
            </div>
          </div>

          {/* Tutiful branding */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          }}>
            <Text size="xs" c="dimmed" style={{ fontSize: '9px' }}>
              Powered by
            </Text>
          </div>
        </div>
      </div>

        {/* Top Navbar Preview */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '8px'
        }}>
          <Text size="sm" c="dimmed" mb="xs">Top Navbar Preview:</Text>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            padding: '0.5rem'
          }}>
            <div>
              <Text size="md" fw={600}>
                {previewAgencyName} Panel
              </Text>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const OriginalDataDisplay = () => {
    if (!originalAgencyData) return null;

    return (
      <Card shadow="sm" padding="md" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <Group mb="xs">
          <IconInfoCircle size={16} color="#0369a1" />
          <Text size="sm" fw={500} style={{ color: '#0369a1' }}>
            Original Agency Data
          </Text>
        </Group>
        <Stack spacing="xs">
          <Text size="xs">
            <strong>Original Name:</strong> {originalAgencyData.name || 'Not set'}
          </Text>
          {originalAgencyData.aboutUs && (
            <Text size="xs" lineClamp={2}>
              <strong>Original Description:</strong> {originalAgencyData.aboutUs}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            These are your original agency details from when you registered.
          </Text>
        </Stack>
      </Card>
    );
  };

  const ImageSelectionSection = () => {
    if (availableImages.length === 0) return null;

    return (
      <Card shadow="sm" padding="md" style={{ border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
        <Text size="sm" fw={500} mb="xs">Select Brand Image:</Text>
        <Text size="xs" c="dimmed" mb="md">
          Choose one of the available images from the website to use as your brand logo
        </Text>
        
        <SimpleGrid cols={3} spacing="md">
          {availableImages.map((img, index) => (
            <Card 
              key={img.key}
              padding="sm" 
              style={{ 
                border: selectedImage === img.url ? '2px solid #6155F5' : '1px solid #ddd',
                cursor: 'pointer',
                backgroundColor: selectedImage === img.url ? '#f8f9ff' : 'white',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleImageSelect(img.url)}
            >
              <Stack align="center" spacing="xs">
                <Image
                  src={img.url}
                  alt={img.label}
                  height={60}
                  width={60}
                  fit="contain"
                  style={{ borderRadius: '4px' }}
                  onError={(e) => {
                    console.log(`Image failed to load: ${img.label} - ${img.url}`);
                    e.target.style.display = 'none';
                  }}
                />
                <Text size="xs" ta="center" lineClamp={2}>
                  {img.label}
                </Text>
                {selectedImage === img.url && (
                  <IconCheck size={16} color="#6155F5" />
                )}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
        
        {selectedImage && (
          <Card shadow="sm" padding="sm" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Group>
              <Text size="sm" fw={500}>Selected Image:</Text>
              <Image
                src={selectedImage}
                alt="Selected"
                height={30}
                width={30}
                fit="contain"
                style={{ borderRadius: '4px' }}
              />
              <Text size="xs" c="dimmed">
                This image will be used as your brand logo
              </Text>
            </Group>
          </Card>
        )}
      </Card>
    );
  };

  const ExtractedDataDisplay = () => {
    const dataToDisplay = extractedData || existingCustomization?.customTheme;
    if (!dataToDisplay) return null;

    // Get available colors for selection
    const availableColors = dataToDisplay.colors && dataToDisplay.colors.length > 0 ? dataToDisplay.colors : [];
    const selectData = availableColors.map((color, index) => ({
      value: color,
      label: `Color ${index + 1}: ${color}`,
    }));

    return (
      <Card shadow="sm" padding="lg" style={{ border: '2px solid #e0e0e0', marginBottom: '1rem' }}>
        <Text size="lg" fw={500} mb="md">
          {existingCustomization ? 'Current Customization' : 'Extracted Website Data'}
        </Text>
        
        <Stack spacing="md">
          {/* Show original data if editing */}
          {existingCustomization && <OriginalDataDisplay />}

          {/* Agency Name */}
          <div>
            <Text size="sm" fw={500} mb="xs">Agency Name:</Text>
            <TextInput
              ref={displayNameInputRef}
              key={`agency-name-${displayName}`}
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Edit agency name..."
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              error={displayName.length > MAX_DISPLAY_NAME_LENGTH ? 
                `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` : null}
              rightSection={
                <Text size="sm" c={displayName.length > MAX_DISPLAY_NAME_LENGTH ? "red" : "dimmed"}>
                  {characterCount}/{MAX_DISPLAY_NAME_LENGTH}
                </Text>
              }
            />
            <Text size="xs" c="dimmed" mt={4}>
              {extractedData && extractedData.title ? `Extracted from website: ${extractedData.title}` : 
               extractedData ? 'No title extracted from website' : 'Edit to update your agency name'}
            </Text>
          </div>

          {/* Agency Description */}
          <div>
            <Text size="sm" fw={500} mb="xs">Agency Description:</Text>
            <Textarea
              value={agencyDescription}
              onChange={handleAgencyDescriptionChange}
              placeholder="Enter agency description..."
              rows={3}
            />
            <Text size="xs" c="dimmed" mt={4}>
              This description will be saved to your agency profile.
            </Text>
          </div>

          {/* Image Selection Section */}
          <ImageSelectionSection />

          {/* Show ALL extracted data */}
          {(extractedData || existingCustomization) && (
            <Card shadow="sm" padding="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Text size="sm" fw={500} mb="xs">Available Data:</Text>
              <Stack spacing="xs">
                {dataToDisplay.title && (
                  <Text size="xs"><strong>Title:</strong> {dataToDisplay.title}</Text>
                )}
                
                {dataToDisplay.description && (
                  <Text size="xs" lineClamp={2}><strong>Description:</strong> {dataToDisplay.description}</Text>
                )}
                
                {/* Show ALL available images */}
                {availableImages.length > 0 && (
                  <div>
                    <Text size="xs" fw={500} mb="xs">Available Images:</Text>
                    <Stack spacing="xs">
                      {availableImages.map((img) => (
                        <div key={img.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img 
                            src={img.url} 
                            alt={img.label}
                            style={{ 
                              width: '24px', 
                              height: '24px',
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              console.log(`Image failed to load: ${img.label} - ${img.url}`);
                              e.target.style.display = 'none';
                            }}
                          />
                          <Text size="xs">{img.label}</Text>
                        </div>
                      ))}
                    </Stack>
                  </div>
                )}
                
                {availableColors.length === 0 && (
                  <Text size="xs" c="orange">No brand colors detected</Text>
                )}
              </Stack>
            </Card>
          )}

          {/* Color Selection Section */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              Select Primary Brand Color:
            </Text>

            {/* Multiple Choice Selection for Extracted Colors */}
            {availableColors.length > 0 && (
              <>
                <Select
                  value={selectedColor}
                  onChange={handleColorSelect}
                  placeholder="Choose from extracted colors"
                  data={selectData}
                  mb="md"
                />
                
                {/* Color Swatches Preview */}
                <Text size="xs" c="dimmed" mb="xs">Click on a color to select:</Text>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {availableColors.map((color, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: selectedColor === color ? '2px solid #6155F5' : '1px solid #ddd',
                        backgroundColor: selectedColor === color ? '#f8f9ff' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleColorSelect(color)}
                    >
                      <ColorSwatch color={color} size={24} />
                      <Text size="sm" fw={selectedColor === color ? 600 : 400}>
                        {color}
                      </Text>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Custom Color Picker */}
            <Card shadow="sm" padding="md" style={{ border: '1px solid #e0e0e0' }}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>Or choose a custom color:</Text>
                <Button
                  variant="outline"
                  size="xs"
                  leftSection={<IconColorPicker size={14} />}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  {showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}
                </Button>
              </Group>

              {showColorPicker && (
                <Stack gap="md">
                  <ColorPicker
                    format="hex"
                    value={customColor}
                    onChange={handleCustomColorSelect}
                    swatches={[
                      '#6155F5', '#2E8B57', '#FF6B6B', '#4ECDC4', '#45B7D1',
                      '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
                    ]}
                  />
                  
                  <Group>
                    <TextInput
                      placeholder="#FFFFFF"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setSelectedColor(e.target.value);
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddCustomColor}
                      disabled={!customColor}
                    >
                      Add Color
                    </Button>
                  </Group>
                  
                  {customColor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text size="sm">Preview:</Text>
                      <ColorSwatch color={customColor} size={20} />
                      <Text size="sm">{customColor}</Text>
                    </div>
                  )}
                </Stack>
              )}

              {/* Manual Color Input Fallback */}
              {!showColorPicker && (
                <TextInput
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  placeholder="#6155F5"
                  leftSection={
                    <ColorSwatch 
                      color={selectedColor || '#ccc'} 
                      size={16}
                      style={{ border: '1px solid #ccc' }}
                    />
                  }
                />
              )}
            </Card>

            {/* Selected Color Display */}
            {selectedColor && (
              <Card shadow="sm" padding="sm" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Group>
                  <Text size="sm" fw={500}>Selected Color:</Text>
                  <ColorSwatch color={selectedColor} size={20} />
                  <Text size="sm" fw={600} style={{ color: selectedColor }}>
                    {selectedColor}
                  </Text>
                </Group>
              </Card>
            )}
          </div>
        </Stack>
      </Card>
    );
  };

  // Different button based on whether customization exists
  const CustomizationButton = () => {
    if (existingCustomization) {
      return (
        <Button 
          leftSection={<IconEdit size={16} />} 
          variant="filled" 
          size="sm" 
          onClick={() => setModalOpen(true)}
          style={{ marginLeft: 'auto', backgroundColor: existingCustomization.customTheme?.colors?.[0] || '#6155F5' }}
        >
          Edit Branding
        </Button>
      );
    }

    return (
      <Button 
        leftSection={<IconPlus size={16} />} 
        variant="outline" 
        size="sm" 
        onClick={() => setModalOpen(true)}
        style={{ marginLeft: 'auto' }}
      >
        Customise your website!
      </Button>
    );
  };

  return (
    <>
      <CustomizationButton />

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreviewMode(false);
          if (!existingCustomization) {
            setDisplayName("");
            setExtractedData(null);
            setWebsiteUrl("");
            setSelectedColor("");
            setCustomColor("");
            setShowColorPicker(false);
            setAgencyDescription("");
            setSelectedImage("");
            setAvailableImages([]);
          }
        }}
        title={existingCustomization ? "Edit Your Branding" : "Customize Your Agency Branding"}
        centered
        size="lg"
      >
        <Stack spacing="md">
          {/* Website URL Input - Manual extraction only */}
          <Card shadow="sm" padding="md">
            <Text size="sm" fw={500} mb="xs">
              {existingCustomization ? 'Update Your Website URL' : 'Start with your website URL:'}
            </Text>
            <Group>
              <TextInput
                placeholder="https://youragency.com"
                value={websiteUrl}
                onChange={handleWebsiteUrlChange}
                style={{ flex: 1 }}
              />
              <Button
                variant="outline"
                onClick={handleExtractMetadata}
                loading={loadingExtraction}
                disabled={!websiteUrl || websiteUrl.length < 10}
                leftSection={<IconDownload size={16} />}
              >
                Extract
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {existingCustomization 
                ? 'Update your website URL and click Extract to get new branding data'
                : 'Enter your website URL and click Extract to get your branding automatically'
              }
            </Text>
          </Card>

          {/* Extracted Data Display */}
          {(extractedData || existingCustomization) && <ExtractedDataDisplay />}

          {/* Manual Input Fallback */}
          {!extractedData && !existingCustomization && (
            <Card shadow="sm" padding="md">
              <Text size="sm" fw={500} mb="xs">Or customize manually:</Text>
              <TextInput
                ref={displayNameInputRef}
                label="Agency Display Name"
                description={`Maximum ${MAX_DISPLAY_NAME_LENGTH} characters`}
                placeholder="Enter your agency display name..."
                value={displayName}
                onChange={handleDisplayNameChange}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                error={displayName.length > MAX_DISPLAY_NAME_LENGTH ? 
                  `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` : null}
                rightSection={
                  <Text size="sm" c={displayName.length > MAX_DISPLAY_NAME_LENGTH ? "red" : "dimmed"}>
                    {characterCount}/{MAX_DISPLAY_NAME_LENGTH}
                  </Text>
                }
              />
              <Textarea
                label="Agency Description"
                placeholder="Enter agency description..."
                value={agencyDescription}
                onChange={handleAgencyDescriptionChange}
                rows={3}
                mt="md"
              />
            </Card>
          )}

          {/* Preview */}
          {previewMode && <PreviewComponent />}

          {displayName.length > 20 && displayName.length <= MAX_DISPLAY_NAME_LENGTH && (
            <Alert color="yellow">
              <Text size="sm">
                Your display name is getting long. Consider a shorter version for better display.
              </Text>
            </Alert>
          )}

          {displayName.length > MAX_DISPLAY_NAME_LENGTH && (
            <Alert color="red">
              <Text size="sm">
                Display name exceeds {MAX_DISPLAY_NAME_LENGTH} characters. Please shorten it before saving.
              </Text>
            </Alert>
          )}

          <Group justify="space-between" mt="xl">
            <Button
              variant="outline"
              leftSection={<IconEye size={16} />}
              onClick={() => setPreviewMode(!previewMode)}
              disabled={!displayName}
            >
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </Button>
            
            <Group>
              {/* Reset Data Button */}
              {existingCustomization && (
                <Button
                  variant="outline"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleResetData}
                >
                  Reset to Default
                </Button>
              )}
              
              {!existingCustomization && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDisplayName("");
                    setWebsiteUrl("");
                    setExtractedData(null);
                    setSelectedColor("");
                    setCustomColor("");
                    setShowColorPicker(false);
                    setPreviewMode(false);
                    setAgencyDescription("");
                    setSelectedImage("");
                    setAvailableImages([]);
                  }}
                >
                  Reset
                </Button>
              )}
              
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleUrlSubmit}
                loading={submitting}
                disabled={!isDisplayNameValid()}
              >
                {submitting ? "Processing..." : existingCustomization ? "Update Branding" : "Save Customization"}
              </Button>
            </Group>
          </Group>

          <Card shadow="sm" padding="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Text size="sm" c="dimmed">
              <strong>Tips:</strong>
              <br />• Keep display name under 20 characters for best appearance
              <br />• Display name must be {MAX_DISPLAY_NAME_LENGTH} characters or less
              <br />• Choose from extracted brand colors or pick a custom color
              <br />• Select one of the available images as your brand logo
              <br />• Use the color picker for precise color selection
              <br />• All fields are editable. Customize as needed
              <br />• Use "Reset to Default" to remove customization and return to Tutiful branding
            </Text>
          </Card>
        </Stack>
      </Modal>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default CustomizationComponent;