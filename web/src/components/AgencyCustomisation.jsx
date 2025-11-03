import React, { useState, useEffect, useRef } from 'react';
import { Modal, TextInput, Button, Text, Alert, Card, Group, Stack, Grid, ColorSwatch, Select, ColorPicker } from "@mantine/core";
import { IconPlus, IconCheck, IconX, IconEye, IconDownload, IconRefresh, IconEdit, IconColorPicker } from "@tabler/icons-react";
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
  
  const MAX_DISPLAY_NAME_LENGTH = 25;
  const displayNameInputRef = useRef(null);

  // Load existing customization when component mounts
  useEffect(() => {
    loadExistingCustomization();
  }, []);

  const loadExistingCustomization = async () => {
    try {
      const response = await ApiClient.get("/tenant/customization");
      if (response.success && response.config && response.config.customTheme) {
        setExistingCustomization(response.config);
        // Pre-populate fields with existing data
        if (response.config.customTheme.displayName) {
          setDisplayName(response.config.customTheme.displayName);
          setCharacterCount(response.config.customTheme.displayName.length);
        }
        if (response.config.customTheme.websiteUrl) {
          setWebsiteUrl(response.config.customTheme.websiteUrl);
        }
        if (response.config.customTheme) {
          setExtractedData(response.config.customTheme);
          // Set selected color from existing customization
          if (response.config.customTheme.colors && response.config.customTheme.colors.length > 0) {
            setSelectedColor(response.config.customTheme.colors[0]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load existing customization:", error);
    }
  };

  // Manual extraction only - no auto-extract
  const handleExtractMetadata = async () => {
    if (!websiteUrl || websiteUrl.length < 10) return;
    
    setLoadingExtraction(true);
    try {
      console.log("Extracting metadata from:", websiteUrl);
      
      const extractRes = await ApiClient.post(
        "/tenant/extract-metadata",
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

    console.log("Final metadata being set:", metadata); // Add this line
      setExtractedData(metadata);
      
      // Show which image was selected in the console
      if (metadata.displayImage) {
        console.log("Selected display image:", metadata.displayImage);
        console.log("Available images:", {
          logo: metadata.logo,
          ogImage: metadata.ogImage,
          twitterImage: metadata.twitterImage,
          largeIcon: metadata.largeIcon,
          favicon: metadata.favicon
        });
      }
      
      // Auto-populate display name with extracted title (can be edited)
      // BUT trim it to 25 characters if it's too long
      if (metadata.title && !displayName) {
        const title = metadata.title;
        if (title.length > MAX_DISPLAY_NAME_LENGTH) {
          // Show warning notification
          notifications.show({
            title: "Title Too Long",
            message: `Website title "${title}" exceeds ${MAX_DISPLAY_NAME_LENGTH} characters. Please edit it before saving.`,
            color: "orange",
            icon: <IconX size={16} />,
          });
        }
        // Set the display name (user can edit it if too long)
        setDisplayName(title);
        setCharacterCount(title.length);
      } else if (!metadata.title && !displayName) {
        // If no title extracted, suggest using the domain name
        const domainName = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
        setDisplayName(domainName);
        setCharacterCount(domainName.length);
      }
      
      // Auto-select first color if available
      if (metadata.colors && metadata.colors.length > 0) {
        setSelectedColor(metadata.colors[0]);
      } else {
        // If no colors extracted, set a default color
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
    
    // Store cursor position before update
    const cursorPosition = e.target.selectionStart;
    
    // Always allow typing, but enforce limit
    if (value.length <= MAX_DISPLAY_NAME_LENGTH) {
      setDisplayName(value);
      setCharacterCount(value.length);
    } else {
      // If user tries to type beyond limit, don't update but preserve cursor
      setDisplayName(value.substring(0, MAX_DISPLAY_NAME_LENGTH));
      setCharacterCount(MAX_DISPLAY_NAME_LENGTH);
    }
    
    // Restore cursor position after state update
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

  const handleUrlSubmit = async () => {
    // Validate display name before submitting
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

      // Use extracted data or create basic structure 
      const customTheme = extractedData ? {
        ...extractedData, // This now includes displayImage, logo, ogImage, etc.
        displayName: displayName || extractedData.title,
        websiteUrl: websiteUrl,
        colors: colors
      } : {
        title: displayName,
        displayName: displayName,
        websiteUrl: websiteUrl,
        colors: colors
      };

      // Use consistent endpoint with PATCH/POST
      let saveRes;
      if (existingCustomization) {
        saveRes = await ApiClient.patch("/tenant/customization", {
          websiteUrl,
          customTheme,
          useCustomTheme: true,
        });
      } else {
        saveRes = await ApiClient.post("/tenant/customization", {
          websiteUrl,
          customTheme,
          useCustomTheme: true,
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
        // Reload to get updated data
        loadExistingCustomization();
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
    const agencyName = displayName || existingCustomization?.customTheme?.displayName || 'Your Agency';

    const logoUrl = extractedData?.displayImage || 
                  existingCustomization?.customTheme?.displayImage ||
                  extractedData?.logo ||
                  existingCustomization?.customTheme?.logo;
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
                alt={agencyName}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  objectFit: 'contain'
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
                {agencyName.charAt(0)}
              </div>
            )}
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: primaryColor,
                lineHeight: 1.1,
              }}>
                {agencyName}
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
            <Text size="xs" c="dimmed" style={{ fontSize: '9px', fontWeight: 500 }}>
              Tutiful
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
                {agencyName} Panel
              </Text>
            </div>
          </div>
        </div>
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

    // Show extracted data even if some fields are empty
    const hasExtractedData = extractedData && (
      extractedData.title || 
      extractedData.favicon || 
      (extractedData.colors && extractedData.colors.length > 0) ||
      extractedData.description
    );

    return (
      <Card shadow="sm" padding="lg" style={{ border: '2px solid #e0e0e0', marginBottom: '1rem' }}>
        <Text size="lg" fw={500} mb="md">
          {existingCustomization ? 'Current Customization' : 'Extracted Website Data'}
        </Text>
        
        <Stack spacing="md">
          {/* Agency Name - FIXED WITH REF */}
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
              {extractedData && extractedData.title ? `Original: ${extractedData.title}` : 
               extractedData ? 'No title extracted from website' : 'Edit to update your agency name'}
            </Text>
          </div>

          {/* Show extracted data summary */}
            {hasExtractedData && (
            <Card shadow="sm" padding="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Text size="sm" fw={500} mb="xs">Extracted Data:</Text>
                <Stack spacing="xs">
                {extractedData.title && (
                    <Text size="xs">Title: {extractedData.title}</Text>
                )}
                
                {/* Show the actual image that will be used */}
                {extractedData.displayImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text size="xs">Logo/Image:</Text>
                    <img 
                        src={extractedData.displayImage} 
                        alt="Website Logo" 
                        style={{ 
                        width: '32px', 
                        height: '32px',
                        borderRadius: '4px',
                        objectFit: 'contain'
                        }}
                    />
                    <Text size="xs" c="dimmed">
                        (Will be used in sidebar)
                    </Text>
                    </div>
                )}
                
                {/* Show all available images for debugging */}
                {extractedData.logo && extractedData.logo !== extractedData.displayImage && (
                    <Text size="xs" c="dimmed">Also found logo: {extractedData.logo}</Text>
                )}
                {extractedData.ogImage && extractedData.ogImage !== extractedData.displayImage && (
                    <Text size="xs" c="dimmed">Also found Open Graph image</Text>
                )}
                
                {extractedData.description && (
                    <Text size="xs" lineClamp={2}>Description: {extractedData.description}</Text>
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
              <br />• Use the color picker for precise color selection
              <br />• All fields are editable. Customize as needed
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