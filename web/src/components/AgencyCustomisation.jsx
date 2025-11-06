import React, { useState, useEffect, useRef, aboutUsRef } from 'react';
import { Modal, TextInput, Button, Text, Alert, Card, Group, Stack, ColorSwatch, Select, ColorPicker, Textarea, SimpleGrid, Image } from "@mantine/core";
import { IconPlus, IconCheck, IconX, IconEye, IconDownload, IconColorPicker, IconInfoCircle, IconTrash, IconPalette, IconShieldCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Loader } from "@mantine/core";
import ApiClient from "../api/apiClient";

const CustomizationComponent = ({ agencyId }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [loadingExtraction, setLoadingExtraction] = useState(false);
    const [existingCustomization, setExistingCustomization] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // Track both URL validity AND safety status
    const [urlStatus, setUrlStatus] = useState({
        isValid: false,
        isSafe: false,
        isChecking: false,
        lastCheckedUrl: ""
    });    
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

    // Check URL validity AND safety
    useEffect(() => {
        const checkUrlValidityAndSafety = async () => {
            if (!currentData.websiteUrl || currentData.websiteUrl.length < 10) {
                setUrlStatus({
                    isValid: false,
                    isSafe: false,
                    isChecking: false,
                    lastCheckedUrl: currentData.websiteUrl
                });
                return;
            }

            setUrlStatus(prev => ({ ...prev, isChecking: true }));

            try {
                // Step 1: Basic URL format validation
                const urlObj = new URL(currentData.websiteUrl);
                
                // Additional format checks
                if (!urlObj.hostname || urlObj.hostname.split('.').length < 2) {
                    throw new Error('Invalid domain format');
                }

                console.log(`✅ URL format is valid: ${currentData.websiteUrl}`);
                
                // Step 2: Enhanced client-side safety checks
                const isSafe = await performClientSideSafetyChecks(urlObj);
                
                const newStatus = {
                    isValid: true,
                    isSafe: isSafe,
                    isChecking: false,
                    lastCheckedUrl: currentData.websiteUrl
                };

                setUrlStatus(newStatus);

                // Show green notification when URL becomes safe and valid
                if (isSafe && currentData.websiteUrl !== urlStatus.lastCheckedUrl) {
                    notifications.show({
                        title: "URL Validated ✓",
                        message: "Website URL is properly formatted and ready for extraction!",
                        color: "green",
                        icon: <IconShieldCheck size={16} />,
                        autoClose: 4000,
                    });
                }

            } catch (error) {
                console.log(`URL check failed:`, error.message);
                
                setUrlStatus({
                    isValid: false,
                    isSafe: false,
                    isChecking: false,
                    lastCheckedUrl: currentData.websiteUrl
                });
            }
        };

        // Debounce the URL check
        const timeoutId = setTimeout(checkUrlValidityAndSafety, 800);
        return () => clearTimeout(timeoutId);
    }, [currentData.websiteUrl]);

    // Client-side safety checks
    const performClientSideSafetyChecks = async (urlObj) => {
        const hostname = urlObj.hostname.toLowerCase();
        const pathname = urlObj.pathname.toLowerCase();

        // 1. Check for dangerous file extensions
        const dangerousPatterns = [
            /\.(exe|zip|rar|jar|dmg|pkg|scr|bat|cmd)$/i,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(pathname)) {
                console.log(`❌ Dangerous file pattern detected: ${pattern}`);
                return false;
            }
        }

        // 2. Check for localhost/internal IPs
        if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
            console.log(`❌ Local/internal IP blocked: ${hostname}`);
            return false;
        }

        // 3. Check for explicitly blocked domains (minimal list)
        const blockedDomains = [
            'malicious-site.com',
            'phishing-site.net'
        ];

        if (blockedDomains.includes(hostname)) {
            console.log(`❌ Domain explicitly blocked: ${hostname}`);
            return false;
        }

        console.log(`✅ All client-side safety checks passed`);
        return true;
    };

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
                name: agencyData.name, 
                aboutUs: agencyData.aboutUs, 
                image: agencyData.image 
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
            
            setCurrentData(newData);
            if (newData.websiteUrl) {
            setUrlStatus({
                isValid: true,
                isSafe: true,
                isChecking: false,
                lastCheckedUrl: newData.websiteUrl
            });
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
    
    // Additional safety check before extraction
    if (!urlStatus.isValid) {
        notifications.show({
            title: "Invalid URL",
            message: "Please enter a valid website URL before extracting.",
            color: "red",
            icon: <IconX size={16} />,
        });
        return;
    }

    setLoadingExtraction(true);

    try {
        console.log("Extracting metadata from:", currentData.websiteUrl);

        const extractRes = await ApiClient.post(
            `/agencies/${agencyId}/extract-metadata`,
            { websiteUrl: currentData.websiteUrl }
        );
        console.log("Full extract response:", extractRes);

        // Handle different response structures
        let success, metadata, error;
        
        if (extractRes.success !== undefined) {
            success = extractRes.success;
            metadata = extractRes.metadata;
            error = extractRes.error;
        } else if (extractRes.data?.success !== undefined) {
            success = extractRes.data.success;
            metadata = extractRes.data.metadata;
            error = extractRes.data.error;
        } else {
            success = false;
            error = "Invalid response format from server";
        }

        if (!success) {
            throw new Error(error || "Extraction failed");
        }

        console.log("Extracted metadata:", metadata);

        // Create the base updated data object
        const baseUpdatedData = {
            ...currentData,
            extractedData: metadata,
            availableImages: extractAvailableImages(metadata)
        };

        // DEBUG: Log what we're getting from metadata
        console.log("Metadata fields:", {
            title: metadata?.title,
            ogTitle: metadata?.ogTitle,
            description: metadata?.description,
            ogDescription: metadata?.ogDescription,
            hasTitle: !!(metadata?.title || metadata?.ogTitle),
            hasDescription: !!(metadata?.description || metadata?.ogDescription)
        });

        // AUTO-POPULATION LOGIC - FIXED
        const updatedData = { ...baseUpdatedData };

        // Priority order for agency name: og:title > title > fallback to domain
        const extractedTitle = metadata?.ogTitle || metadata?.title;
        
        // Auto-populate display name - always use extracted title if available
        if (extractedTitle && extractedTitle.trim()) {
            const title = extractedTitle.trim();
            updatedData.displayName = title;
            
            if (title.length > MAX_DISPLAY_NAME_LENGTH) {
                notifications.show({
                    title: "Title Too Long",
                    message: `Website title "${title}" exceeds ${MAX_DISPLAY_NAME_LENGTH} characters. Please edit it before saving.`,
                    color: "orange",
                    icon: <IconX size={16} />,
                });
            } else {
                notifications.show({
                    title: "Name Auto-filled",
                    message: "Agency name has been auto-filled from website title",
                    color: "blue",
                    icon: <IconInfoCircle size={16} />,
                });
            }
        } 
        // Fallback to domain name if no title and no existing name
        else if (!updatedData.displayName) {
            const domainName = currentData.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            updatedData.displayName = domainName;
            console.log("Using domain name as fallback:", domainName);
        }
        
        // Priority order for description: og:description > description
        const extractedDescription = metadata?.ogDescription || metadata?.description;
        
        // Auto-populate about us from metadata description
        if (extractedDescription && extractedDescription.trim()) {
            const description = extractedDescription.trim();
            updatedData.aboutUs = description;
            notifications.show({
                title: "Description Found",
                message: "Agency description has been auto-filled",
                color: "blue",
                icon: <IconInfoCircle size={16} />,
            });
        }
        
        // Auto-select color
        if (metadata?.colors && metadata.colors.length > 0) {
            updatedData.selectedColor = metadata.colors[0];
        } else if (!currentData.selectedColor) {
            updatedData.selectedColor = '#6155F5';
        }

        // Auto-select first available image
        if (updatedData.availableImages.length > 0 && !currentData.selectedImage) {
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

        console.log("Final updated data:", {
            displayName: updatedData.displayName,
            aboutUs: updatedData.aboutUs,
            selectedColor: updatedData.selectedColor,
            selectedImage: updatedData.selectedImage,
            availableImages: updatedData.availableImages.length
        });

        // FIX: Only update currentData, NOT initialData
        setCurrentData(updatedData);
        setPreviewMode(true);
        
        notifications.show({
            title: "Success",
            message: "Website data extracted successfully! Fields have been auto-populated.",
            color: "green",
            icon: <IconCheck size={16} />,
        });

    } catch (error) {
        console.error("Error extracting metadata:", error);
        
        let errorMessage = "Could not extract website data. ";
        
        if (error.message.includes("Invalid URL")) {
            errorMessage = error.message;
        } else if (error.message.includes("blocked")) {
            errorMessage = "This website was blocked for security reasons";
        } else if (error.message.includes("timeout")) {
            errorMessage = "The website took too long to respond. Please try again.";
        } else if (error.message.includes("ENOTFOUND")) {
            errorMessage = "Website not found. Please check the URL and try again.";
        } else {
            errorMessage += "The website might be blocking our requests or the extraction service might be down.";
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

    const handleInputChange = (field, value) => {
        setCurrentData(prev => ({ ...prev, [field]: value }));
    };

const handleDisplayNameChange = (e) => {
    const value = e.target.value;
    // Allow full input without truncation
    handleInputChange('displayName', value);
    
    // Keep cursor position
    setTimeout(() => {
        if (displayNameInputRef.current) {
            displayNameInputRef.current.focus();
            displayNameInputRef.current.setSelectionRange(e.target.selectionStart, e.target.selectionStart);
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
                
                setInitialData(currentData);
                setModalOpen(false);
                window.dispatchEvent(new Event('customizationUpdated'));
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

    // Preview Component
    const PreviewComponent = () => {
        const primaryColor = currentData.selectedColor || existingCustomization?.customTheme?.colors?.[0] || '#6155F5';
        const previewAgencyName = currentData.displayName || existingCustomization?.customTheme?.displayName || 'Your Agency';

        const logoUrl = currentData.selectedImage || 
                      currentData.extractedData?.displayImage || 
                      existingCustomization?.customTheme?.displayImage ||
                      currentData.extractedData?.logo ||
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

    // Image Selection Section
    const ImageSelectionSection = () => {
        if (currentData.availableImages.length === 0) return null;

        return (
            <Card shadow="sm" padding="md" style={{ border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
                <Text size="sm" fw={500} mb="xs">Select Brand Image:</Text>
                <Text size="xs" c="dimmed" mb="md">
                    Choose one of the available images from the website to use as your brand logo
                </Text>
                
                <SimpleGrid cols={3} spacing="md">
                    {currentData.availableImages.map((img) => (
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

    // Extracted Data Display
    const ExtractedDataDisplay = () => {
        const dataToDisplay = currentData.extractedData || existingCustomization?.customTheme;
        if (!dataToDisplay) return null;

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
                        // REMOVED: maxLength={MAX_DISPLAY_NAME_LENGTH}
                        error={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? 
                            `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less (current: ${currentData.displayName.length})` : null}
                        rightSection={
                            <Text size="sm" c={currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH ? "red" : "dimmed"}>
                                {characterCount}/{MAX_DISPLAY_NAME_LENGTH}
                            </Text>
                        }
                    />
                    {currentData.displayName.length > MAX_DISPLAY_NAME_LENGTH && (
                        <Text size="xs" c="red" mt={4}>
                            This name is too long for display. Please shorten it to {MAX_DISPLAY_NAME_LENGTH} characters or less.
                        </Text>
                    )}
                </div>

                    {/* Agency Description */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">Agency Description:</Text>
                        <Textarea
                            ref={aboutUsRef}
                            value={currentData.aboutUs}
                            onChange={(e) => handleInputChange('aboutUs', e.target.value)}
                            placeholder="Enter agency description..."
                            rows={3}
                        />
                    </div>

                    {/* Image Selection Section */}
                    <ImageSelectionSection />

                    {/* Color Selection Section */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">
                            Select Primary Brand Color:
                        </Text>

                        {availableColors.length > 0 && (
                            <>
                                <Select
                                    value={currentData.selectedColor}
                                    onChange={handleColorSelect}
                                    placeholder="Choose from extracted colors"
                                    data={selectData}
                                    mb="md"
                                />
                                
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
                                </Stack>
                            )}

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

    // Customization Button
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
                    setUrlStatus({
                        isValid: false,
                        isSafe: false,
                        isChecking: false,
                        lastCheckedUrl: ""
                    });
                    if (existingCustomization) {
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
                                  {/* ENHANCED: Website URL Input with Safety Status */}
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
                            rightSection={
                                urlStatus.isChecking ? (
                                    <Loader size={16} />
                                ) : urlStatus.isValid && urlStatus.isSafe ? (
                                    <IconShieldCheck size={16} style={{ color: '#40c057' }} />
                                ) : urlStatus.isValid ? (
                                    <IconCheck size={16} style={{ color: '#fab005' }} />
                                ) : currentData.websiteUrl.length > 0 ? (
                                    <IconX size={16} style={{ color: '#fa5252' }} />
                                ) : null
                            }
                            rightSectionPointerEvents="none"
                        />
                            <Button
                                variant="outline"
                                onClick={handleExtractMetadata}
                                loading={loadingExtraction}
                                disabled={!urlStatus.isValid || !urlStatus.isSafe ||currentData.websiteUrl.length < 10}
                                leftSection={<IconDownload size={16} />}
                            >
                                Extract
                            </Button>
                        </Group>
                        
                        {/* Enhanced status messages */}
                        <Text size="xs" c={
                            urlStatus.isChecking ? "blue" : 
                            urlStatus.isValid && urlStatus.isSafe ? "green" : 
                            urlStatus.isValid ? "orange" : 
                            currentData.websiteUrl.length > 0 ? "red" : "dimmed"
                        } mt={4}>
                            {urlStatus.isChecking ? "Checking URL safety..." :
                             urlStatus.isValid && urlStatus.isSafe ? "✓ URL is valid and safe - ready to extract!" :
                             urlStatus.isValid ? "⚠ URL format is valid but safety not confirmed" :
                             currentData.websiteUrl.length > 0 ? "✗ Please enter a valid website URL" :
                             existingCustomization ? 'Update your website URL and click Extract to get new branding data' :
                             'Enter your website URL and click Extract to get your branding automatically'}
                        </Text>

                        {/* Safety status indicator */}
                        {urlStatus.isValid && urlStatus.isSafe && (
                            <Alert color="green" title="Safe to Extract" icon={<IconShieldCheck size={16} />} mt="sm">
                                <Text size="sm">This website URL has passed safety checks and is ready for metadata extraction.</Text>
                            </Alert>
                        )}
                    </Card>


                    {/* EXTRACTED DATA DISPLAY */}
                    {(currentData.extractedData || existingCustomization) && <ExtractedDataDisplay />}

                    {/* MANUAL INPUT */}
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
                                ref={aboutUsRef}
                                label="Agency Description"
                                placeholder="Enter agency description..."
                                value={currentData.aboutUs}
                                onChange={(e) => handleInputChange('aboutUs', e.target.value)}
                                rows={3}
                                mt="md"
                            />
                        </Card>
                    )}

                    {/* PREVIEW */}
                    {(previewMode || currentData.extractedData) && <PreviewComponent />}

                    {/* VALIDATION MESSAGES */}
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
                </Stack>
            </Modal>
        </>
    );
};

export default CustomizationComponent;