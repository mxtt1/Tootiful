import React, { useState, useEffect, useRef } from 'react';
import { Modal, TextInput, Button, Text, Alert, Card, Group, Stack, Grid, ColorSwatch, Select, ColorPicker, Textarea, SimpleGrid, Image } from "@mantine/core";
import { IconPlus, IconCheck, IconX, IconEye, IconDownload, IconRefresh, IconEdit, IconColorPicker, IconInfoCircle, IconTrash, IconPalette } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import ApiClient from "../api/apiClient";

const CustomizationComponent = ({ agencyId }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [loadingExtraction, setLoadingExtraction] = useState(false);
    const [existingCustomization, setExistingCustomization] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // State management with initial and current values
    const [initialData, setInitialData] = useState({
        websiteUrl: "",
        displayName: "",
        aboutUs: "",
        selectedColor: "",
        selectedImage: "",
        customColor: "",
        extractedData: null,
        availableImages: []
    });
    
    const [currentData, setCurrentData] = useState({
        websiteUrl: "",
        displayName: "",
        aboutUs: "",
        selectedColor: "",
        selectedImage: "",
        customColor: "",
        extractedData: null,
        availableImages: []
    });

    const MAX_DISPLAY_NAME_LENGTH = 25;
    const displayNameInputRef = useRef(null);

    // Calculate character count
    const characterCount = currentData.displayName.length;

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
        console.log("Loading existing customization for agency:", agencyId);
        
        const response = await ApiClient.get(`/agencies/${agencyId}`);
        console.log("Agency API response:", response);
        
        const agencyData = response.data || response;
        console.log("Full agency data:", agencyData); // Debug log
        
        if (agencyData.customTheme || agencyData.useCustomTheme || agencyData.websiteUrl) {
            setExistingCustomization({
                customTheme: agencyData.customTheme,
                useCustomTheme: agencyData.useCustomTheme,
                websiteUrl: agencyData.websiteUrl,
                metadata: agencyData.metadata,
                name: agencyData.name, // Add name
                aboutUs: agencyData.aboutUs, // Add aboutUs
                image: agencyData.image // Add image
            });
            console.log("Existing customization loaded:", {
                customTheme: agencyData.customTheme,
                name: agencyData.name,
                aboutUs: agencyData.aboutUs,
                image: agencyData.image
            });
        } else {
            console.log("No existing customization found");
            setExistingCustomization(null);
        }
    } catch (error) {
        console.error("Failed to load existing customization:", error);
        setExistingCustomization(null);
    }
};

    const populateExistingData = () => {
        if (existingCustomization) {
            const newData = {
                websiteUrl: existingCustomization.websiteUrl || "",
                displayName: existingCustomization.customTheme?.displayName || existingCustomization.name || "",
                aboutUs: existingCustomization.customTheme?.description || existingCustomization.aboutUs || "",
                selectedColor: existingCustomization.customTheme?.colors?.[0] || '#6155F5',
                selectedImage: existingCustomization.customTheme?.selectedImage || "",
                customColor: "",
                extractedData: existingCustomization.metadata || existingCustomization.customTheme || null,
                availableImages: extractAvailableImages({
                    ...(existingCustomization.metadata || {}),
                    ...(existingCustomization.customTheme || {}),
                    image: existingCustomization.image // agency image
                })
            };
            
            setInitialData(newData);
            setCurrentData(newData);
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
            { key: 'agencyImage', label: 'Agency Image', url: data.image },
        ].filter(img => img.url && img.url.trim() !== '');
        
        return images;
    };

    // Check if there are any changes
    const hasChanges = () => {
    return (
        currentData.websiteUrl !== initialData.websiteUrl ||
        currentData.displayName !== initialData.displayName ||
        currentData.aboutUs !== initialData.aboutUs ||
        currentData.selectedColor !== initialData.selectedColor ||
        currentData.selectedImage !== initialData.selectedImage ||
        // Also check if customTheme colors changed
        JSON.stringify(currentData.extractedData?.colors || []) !== 
        JSON.stringify(initialData.extractedData?.colors || [])
    );
    };

    // Manual extraction only - no auto-extract
    const handleExtractMetadata = async () => {
        if (!currentData.websiteUrl || currentData.websiteUrl.length < 10) return;
        
        setLoadingExtraction(true);
        try {
            console.log("Extracting metadata from:", currentData.websiteUrl);
            
            // Validate URL format
            try {
                new URL(currentData.websiteUrl);
            } catch (urlError) {
                throw new Error("Invalid URL format. Please include http:// or https://");
            }

            const extractRes = await ApiClient.post(
                `/agencies/${agencyId}/extract-metadata`,
                { websiteUrl: currentData.websiteUrl }
            );
            console.log("Full extract response:", extractRes);

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
            
            // Update current data with extracted metadata
            const updatedData = {
                ...currentData,
                extractedData: metadata,
                availableImages: extractAvailableImages(metadata)
            };

            // Auto-populate fields from extracted data
            if (metadata.title && !currentData.displayName) {
                const title = metadata.title;
                if (title.length > MAX_DISPLAY_NAME_LENGTH) {
                    notifications.show({
                        title: "Title Too Long",
                        message: `Website title "${title}" exceeds ${MAX_DISPLAY_NAME_LENGTH} characters. Please edit it before saving.`,
                        color: "orange",
                        icon: <IconX size={16} />,
                    });
                }
                updatedData.displayName = title;
            } else if (!metadata.title && !currentData.displayName) {
                const domainName = currentData.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                updatedData.displayName = domainName;
            }
            
            // Auto-populate About Us with extracted description
            if (metadata.description && !currentData.aboutUs) {
                updatedData.aboutUs = metadata.description;
                notifications.show({
                    title: "Description Found",
                    message: "Website description has been auto-filled",
                    color: "blue",
                    icon: <IconInfoCircle size={16} />,
                });
            }
            
            // Auto-select first color if available
            if (metadata.colors && metadata.colors.length > 0) {
                updatedData.selectedColor = metadata.colors[0];
            } else {
                updatedData.selectedColor = '#6155F5';
            }

            // AUTO-SELECT FIRST AVAILABLE IMAGE
            if (metadata.displayImage || metadata.logo || metadata.ogImage) {
                const firstAvailableImage = updatedData.availableImages[0];
                if (firstAvailableImage) {
                    updatedData.selectedImage = firstAvailableImage.url;
                    notifications.show({
                        title: "Image Selected",
                        message: `Auto-selected "${firstAvailableImage.label}" as brand image`,
                        color: "blue",
                        icon: <IconInfoCircle size={16} />,
                    });
                }
            }

            setCurrentData(updatedData);
            setPreviewMode(true);
            
            notifications.show({
                title: "Success",
                message: "Website data extracted successfully! Fields have been auto-populated.",
                color: "green",
                icon: <IconDownload size={16} />,
            });

        } catch (error) {
            console.error("Error extracting metadata:", error);
            
            let errorMessage = "Could not extract website data. ";
            
            if (error.message.includes("Invalid URL")) {
                errorMessage = error.message;
            } else if (error.message.includes("500")) {
                errorMessage += "Server error occurred. The website might be blocking our requests or the extraction service might be down.";
            } else if (error.message.includes("network") || error.message.includes("Network")) {
                errorMessage += "Network error. Please check your connection and try again.";
            } else {
                errorMessage += "You can still customize manually.";
            }
            
            notifications.show({
                title: "Extraction Failed",
                message: errorMessage,
                color: "red",
                icon: <IconX size={16} />,
            });
        } finally {
            setLoadingExtraction(false);
        }
    };

    // Input handlers
    const handleInputChange = (field, value) => {
        setCurrentData(prev => ({ ...prev, [field]: value }));
    };

    const handleDisplayNameChange = (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        if (value.length <= MAX_DISPLAY_NAME_LENGTH) {
            handleInputChange('displayName', value);
        } else {
            handleInputChange('displayName', value.substring(0, MAX_DISPLAY_NAME_LENGTH));
        }
        
        setTimeout(() => {
            if (displayNameInputRef.current) {
                displayNameInputRef.current.focus();
                const newCursorPosition = Math.min(cursorPosition, MAX_DISPLAY_NAME_LENGTH);
                displayNameInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        }, 0);
    };

    const handleColorSelect = (color) => {
        handleInputChange('selectedColor', color);
        setShowColorPicker(false);
    };

    const handleCustomColorSelect = (color) => {
        handleInputChange('customColor', color);
        handleInputChange('selectedColor', color);
    };

    const handleImageSelect = (imageUrl) => {
        handleInputChange('selectedImage', imageUrl);
    };

    const handleAddCustomColor = () => {
        if (currentData.customColor && !currentData.extractedData?.colors?.includes(currentData.customColor)) {
            const updatedExtractedData = {
                ...currentData.extractedData,
                colors: [...(currentData.extractedData?.colors || []), currentData.customColor]
            };
            const updatedData = {
                ...currentData,
                extractedData: updatedExtractedData,
                selectedColor: currentData.customColor,
                customColor: ""
            };
            setCurrentData(updatedData);
            setShowColorPicker(false);
            
            notifications.show({
                title: "Success",
                message: "Custom color added!",
                color: "green",
            });
        }
    };

    const handleResetData = async () => {
        try {
            const resetRes = await ApiClient.patch(`/agencies/${agencyId}`, {
                useCustomTheme: false,
                customTheme: {},
                metadata: {},
                websiteUrl: null
            });
            
            if (resetRes) {
                notifications.show({
                    title: "Success",
                    message: "Customization reset to default!",
                    color: "green",
                });
                
                // Reset all local state
                const resetData = {
                    websiteUrl: "",
                    displayName: "",
                    aboutUs: "",
                    selectedColor: "",
                    selectedImage: "",
                    customColor: "",
                    extractedData: null,
                    availableImages: []
                };
                
                setInitialData(resetData);
                setCurrentData(resetData);
                setExistingCustomization(null);
                setPreviewMode(false);
                
                // Trigger update event for ALL components
                window.dispatchEvent(new Event('customizationUpdated'));
                console.log("Customization reset and update event dispatched");
            } else {
                throw new Error("Failed to reset customization");
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
        if (currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
            notifications.show({
                title: "Display Name Too Long",
                message: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less. Current: ${currentData.displayName.length} characters.`,
                color: "red",
                icon: <IconX size={16} />,
            });
        }
        return;
    }
    
    if (!currentData.displayName.trim()) return;
    
    // Check if there are changes
    if (!hasChanges()) {
        notifications.show({
            title: "No Changes",
            message: "No changes detected to save",
            color: "blue",
            icon: <IconCheck size={16} />,
        });
        setModalOpen(false);
        return;
    }
    
    setSubmitting(true);
    try {
        console.log("Saving customization...");

        // Use selected color as the primary color - ALWAYS include colors
        const colors = currentData.selectedColor ? [currentData.selectedColor] : [];

        // Store ALL extracted data including images and selected image
        const customTheme = currentData.extractedData ? {
        ...currentData.extractedData,
        displayName: currentData.displayName || currentData.extractedData.title,
        websiteUrl: currentData.websiteUrl,
        colors: colors, // Always include colors
        selectedImage: currentData.selectedImage,
        // Preserve all image URLs
        displayImage: currentData.extractedData.displayImage,
        logo: currentData.extractedData.logo,
        ogImage: currentData.extractedData.ogImage,
        twitterImage: currentData.extractedData.twitterImage,
        largeIcon: currentData.extractedData.largeIcon,
        favicon: currentData.extractedData.favicon,
        title: currentData.extractedData.title,
        description: currentData.extractedData.description
        } : {
        title: currentData.displayName,
        displayName: currentData.displayName,
        websiteUrl: currentData.websiteUrl,
        colors: colors, // Always include colors
        selectedImage: currentData.selectedImage
        };

        // Store metadata separately if we have extracted data
        const metadata = currentData.extractedData ? {
        ...currentData.extractedData
        } : null;

        // Prepare update data - only send changed fields
        const updateData = {
        useCustomTheme: true
        };

        // Only include fields that have changed
        if (currentData.websiteUrl !== initialData.websiteUrl) {
        updateData.websiteUrl = currentData.websiteUrl;
        }
        if (currentData.displayName !== initialData.displayName) {
        updateData.name = currentData.displayName;
        }
        if (currentData.aboutUs !== initialData.aboutUs) {
        updateData.aboutUs = currentData.aboutUs;
        }

        // UPDATE: Save the selected image to the agency's image field
        if (currentData.selectedImage && currentData.selectedImage !== initialData.selectedImage) {
            updateData.image = currentData.selectedImage;
        }

        // ALWAYS include customTheme and metadata if we have current data
        // This ensures color changes are saved
        if (currentData.extractedData || currentData.displayName || currentData.selectedColor) {
        updateData.customTheme = customTheme;
        }
        if (currentData.extractedData) {
        updateData.metadata = metadata;
        }

        console.log("Sending update data:", updateData);

        const saveRes = await ApiClient.patch(`/agencies/${agencyId}`, updateData);

        console.log("Save customization response:", saveRes);

        if (saveRes) {
            notifications.show({
                title: "Success",
                message: existingCustomization ? "Branding updated successfully!" : "Customization saved successfully!",
                color: "green",
            });
            
            // Update initial data to current data after successful save
            setInitialData(currentData);
            setModalOpen(false);
            
            // Trigger update event for ALL components
            window.dispatchEvent(new Event('customizationUpdated'));
            console.log("Customization update event dispatched");
            
            // Force reload to get updated data
            await loadExistingCustomization();
        } else {
            throw new Error("Failed to save customization");
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

    const isDisplayNameValid = () => {
        return currentData.displayName.trim().length > 0 && currentData.displayName.length <= MAX_DISPLAY_NAME_LENGTH;
    };

    // FIXED: PreviewComponent using currentData
    const PreviewComponent = () => {
        const primaryColor = currentData.selectedColor || existingCustomization?.customTheme?.colors?.[0] || '#6155F5';
        const previewAgencyName = currentData.displayName || existingCustomization?.customTheme?.displayName || 'Your Agency';

        // Use selected image or fallback to available images
        const logoUrl = currentData.selectedImage || 
                      currentData.extractedData?.displayImage || 
                      existingCustomization?.customTheme?.displayImage ||
                      currentData.extractedData?.logo ||
                      existingCustomization?.customTheme?.logo ||
                      currentData.extractedData?.ogImage ||
                      existingCustomization?.customTheme?.ogImage ||
                      currentData.extractedData?.largeIcon ||
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

    // FIXED: ImageSelectionSection using currentData
    const ImageSelectionSection = () => {
        if (currentData.availableImages.length === 0) return null;

        return (
            <Card shadow="sm" padding="md" style={{ border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
                <Text size="sm" fw={500} mb="xs">Select Brand Image:</Text>
                <Text size="xs" c="dimmed" mb="md">
                    Choose one of the available images from the website to use as your brand logo
                </Text>
                
                <SimpleGrid cols={3} spacing="md">
                    {currentData.availableImages.map((img, index) => (
                        <Card 
                            key={img.key}
                            padding="sm" 
                            style={{ 
                                border: currentData.selectedImage === img.url ? '2px solid #6155F5' : '1px solid #ddd',
                                cursor: 'pointer',
                                backgroundColor: currentData.selectedImage === img.url ? '#f8f9ff' : 'white',
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
                                {currentData.selectedImage === img.url && (
                                    <IconCheck size={16} color="#6155F5" />
                                )}
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
                
                {currentData.selectedImage && (
                    <Card shadow="sm" padding="sm" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
                        <Group>
                            <Text size="sm" fw={500}>Selected Image:</Text>
                            <Image
                                src={currentData.selectedImage}
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

    // ExtractedDataDisplay using currentData
    const ExtractedDataDisplay = () => {
        const dataToDisplay = currentData.extractedData || existingCustomization?.customTheme;
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
                    {/* Agency Name */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Agency Name:</Text>
                        <TextInput
                            ref={displayNameInputRef}
                            value={currentData.displayName}
                            onChange={handleDisplayNameChange}
                            placeholder="Edit agency name..."
                            maxLength={MAX_DISPLAY_NAME_LENGTH}
                            error={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? 
                                `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` : null}
                            rightSection={
                                <Text size="sm" c={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? "red" : "dimmed"}>
                                    {characterCount}/{MAX_DISPLAY_NAME_LENGTH}
                                </Text>
                            }
                        />
                        <Text size="xs" c="dimmed" mt={4}>
                            {currentData.extractedData && currentData.extractedData.title ? 
                                `Extracted from website: ${currentData.extractedData.title}` : 
                                currentData.extractedData ? 'No title extracted from website' : 'Edit to update your agency name'
                            }
                        </Text>
                    </div>

                    {/* Agency Description */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Agency Description:</Text>
                        <Textarea
                            key={`description-${currentData.aboutUs.length}`}
                            value={currentData.aboutUs}
                            onChange={(e) => handleInputChange('aboutUs', e.target.value)}
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
                    {(currentData.extractedData || existingCustomization) && (
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
                                {currentData.availableImages.length > 0 && (
                                    <div>
                                        <Text size="xs" fw={500} mb="xs">Available Images:</Text>
                                        <Stack spacing="xs">
                                            {currentData.availableImages.map((img) => (
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
                                    value={currentData.selectedColor}
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
                                                border: currentData.selectedColor === color ? '2px solid #6155F5' : '1px solid #ddd',
                                                backgroundColor: currentData.selectedColor === color ? '#f8f9ff' : 'transparent',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => handleColorSelect(color)}
                                        >
                                            <ColorSwatch color={color} size={24} />
                                            <Text size="sm" fw={currentData.selectedColor === color ? 600 : 400}>
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
                                        value={currentData.customColor}
                                        onChange={handleCustomColorSelect}
                                        swatches={[
                                            '#6155F5', '#2E8B57', '#FF6B6B', '#4ECDC4', '#45B7D1',
                                            '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
                                        ]}
                                    />
                                    
                                    <Group>
                                        <TextInput
                                            placeholder="#FFFFFF"
                                            value={currentData.customColor}
                                            onChange={(e) => {
                                                handleInputChange('customColor', e.target.value);
                                                handleInputChange('selectedColor', e.target.value);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={handleAddCustomColor}
                                            disabled={!currentData.customColor}
                                        >
                                            Add Color
                                        </Button>
                                    </Group>
                                    
                                    {currentData.customColor && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Text size="sm">Preview:</Text>
                                            <ColorSwatch color={currentData.customColor} size={20} />
                                            <Text size="sm">{currentData.customColor}</Text>
                                        </div>
                                    )}
                                </Stack>
                            )}

                            {/* Manual Color Input Fallback */}
                            {!showColorPicker && (
                                <TextInput
                                    value={currentData.selectedColor}
                                    onChange={(e) => handleInputChange('selectedColor', e.target.value)}
                                    placeholder="#6155F5"
                                    leftSection={
                                        <ColorSwatch 
                                            color={currentData.selectedColor || '#ccc'} 
                                            size={16}
                                            style={{ border: '1px solid #ccc' }}
                                        />
                                    }
                                />
                            )}
                        </Card>

                        {/* Selected Color Display */}
                        {currentData.selectedColor && (
                            <Card shadow="sm" padding="sm" mt="md" style={{ backgroundColor: '#f8f9fa' }}>
                                <Group>
                                    <Text size="sm" fw={500}>Selected Color:</Text>
                                    <ColorSwatch color={currentData.selectedColor} size={20} />
                                    <Text size="sm" fw={600} style={{ color: currentData.selectedColor }}>
                                        {currentData.selectedColor}
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
                    leftSection={<IconPalette size={16} />} 
                    variant="filled" 
                    size="sm" 
                    onClick={() => setModalOpen(true)}
                    style={{ marginLeft: 'auto', backgroundColor: existingCustomization.customTheme?.colors?.[0] || '#6155F5' }}
                >
                    Manage Branding
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
                Setup Branding
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
                        // Reset to initial data when closing without saving
                        if (existingCustomization) {
                            // Reload the existing data instead of resetting
                            populateExistingData();
                        } else {
                            const resetData = {
                                websiteUrl: "",
                                displayName: "",
                                aboutUs: "",
                                selectedColor: "",
                                selectedImage: "",
                                customColor: "",
                                extractedData: null,
                                availableImages: []
                            };
                            setInitialData(resetData);
                            setCurrentData(resetData);
                        }
                    }}
                    title={existingCustomization ? "Manage Your Branding" : "Setup Your Agency Branding"}
                    centered
                    size="lg"
                >
                    <Stack spacing="md">
                        {/* Website URL Input */}
                        <Card shadow="sm" padding="md">
                            <Text size="sm" fw={500} mb="xs">
                                {existingCustomization ? 'Update Your Website URL' : 'Start with your website URL:'}
                            </Text>
                            <Group>
                                <TextInput
                                    placeholder="https://youragency.com"
                                    value={currentData.websiteUrl}
                                    onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleExtractMetadata}
                                    loading={loadingExtraction}
                                    disabled={!currentData.websiteUrl || currentData.websiteUrl.length < 10}
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

                        {/* EXTRACTED DATA DISPLAY - ALWAYS SHOW WHEN WE HAVE DATA */}
                        {(currentData.extractedData || existingCustomization) && <ExtractedDataDisplay />}

                        {/* MANUAL INPUT - ONLY SHOW WHEN NO EXISTING DATA AND NO EXTRACTED DATA */}
                        {!currentData.extractedData && !existingCustomization && (
                            <Card shadow="sm" padding="md">
                                <Text size="sm" fw={500} mb="xs">Or customize manually:</Text>
                                <TextInput
                                    ref={displayNameInputRef}
                                    label="Agency Display Name"
                                    description={`Maximum ${MAX_DISPLAY_NAME_LENGTH} characters`}
                                    placeholder="Enter your agency display name..."
                                    value={currentData.displayName}
                                    onChange={handleDisplayNameChange}
                                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                                    error={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? 
                                        `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less` : null}
                                    rightSection={
                                        <Text size="sm" c={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? "red" : "dimmed"}>
                                            {characterCount}/{MAX_DISPLAY_NAME_LENGTH}
                                        </Text>
                                    }
                                />
                                <Textarea
                                    label="Agency Description"
                                    placeholder="Enter agency description..."
                                    value={currentData.aboutUs}
                                    onChange={(e) => handleInputChange('aboutUs', e.target.value)}
                                    rows={3}
                                    mt="md"
                                />
                            </Card>
                        )}

                        {/* PREVIEW - SHOW WHEN WE HAVE DATA OR IN PREVIEW MODE */}
                        {(previewMode || currentData.extractedData) && <PreviewComponent />}

                        {/* VALIDATION MESSAGES */}
                        {currentData.displayName.length > 25 && currentData.displayName.length <= MAX_DISPLAY_NAME_LENGTH && (
                            <Alert color="yellow">
                                <Text size="sm">
                                    Your display name is getting long. Consider a shorter version for better display.
                                </Text>
                            </Alert>
                        )}

                        {currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH && (
                            <Alert color="red">
                                <Text size="sm">
                                    Display name exceeds {MAX_DISPLAY_NAME_LENGTH} characters. Please shorten it before saving.
                                </Text>
                            </Alert>
                        )}

                        {/* Show change indicator */}
                        {hasChanges() && (
                            <Alert color="blue" title="Unsaved Changes">
                                <Text size="sm">You have unsaved changes. Click "Save" to apply them.</Text>
                            </Alert>
                        )}

                        {/* Action Buttons */}
                        <Group justify="space-between" mt="xl">
                            <Button
                                variant="outline"
                                leftSection={<IconEye size={16} />}
                                onClick={() => setPreviewMode(!previewMode)}
                                disabled={!currentData.displayName}
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
                                            const resetData = {
                                                websiteUrl: "",
                                                displayName: "",
                                                aboutUs: "",
                                                selectedColor: "",
                                                selectedImage: "",
                                                customColor: "",
                                                extractedData: null,
                                                availableImages: []
                                            };
                                            setCurrentData(resetData);
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
                                <br />• Select one of the available images as your brand logo
                                <br />• Use the color picker for precise color selection
                                <br />• All fields are editable. Customize as needed
                                <br />• Use "Reset to Default" to remove customization and return to Tutiful branding
                            </Text>
                        </Card>
                    </Stack>
                </Modal>
            </>
        );


};

export default CustomizationComponent;