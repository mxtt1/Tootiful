import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Stack,
  TextInput,
  Textarea,
  Group,
  Text,
  Loader,
  Alert,
  Modal,
  Tabs,
  Badge,
  ActionIcon,
  Box,
  Flex,
} from "@mantine/core";
import {
  IconEdit,
  IconCheck,
  IconX,
  IconMapPin,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthProvider";
import apiClient from "../../api/apiClient";
import { notifications } from "@mantine/notifications";
import CustomizationComponent from '../../components/AgencyCustomisation';
import { IconPalette } from "@tabler/icons-react";

export default function AgencyProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [personalEditMode, setPersonalEditMode] = useState(false);
  const [agencyEditMode, setAgencyEditMode] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // State for personal details with initial data tracking
  const [personalDetails, setPersonalDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    isActive: true,
  });
  const COOLDOWN = 60;
  const [resendLeft, setResendLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const [initialPersonalData, setInitialPersonalData] = useState({});

  // State for agency info with initial data tracking
  const [agencyInfo, setAgencyInfo] = useState({
    name: "",
    email: "",
    phone: "",
    aboutUs: "",
    isActive: true,
    locations: [],
  });
  const [initialAgencyData, setInitialAgencyData] = useState({});

  // State for new location
  const [newLocation, setNewLocation] = useState({
    address: "",
  });

  // Fetch user personal details
  const fetchPersonalDetails = async () => {
    try {
      const response = await apiClient.get(`/agency-admins/${user.id}`);
      const personalData = {
        firstName: response.firstName || "",
        lastName: response.lastName || "",
        email: response.email || "",
        phone: response.phone || "",
        role: response.role || "",
        isActive: !!response.isActive,
      };

      setPersonalDetails(personalData);
      setInitialPersonalData(personalData);
    } catch (err) {
      setError("Failed to load personal details");
      console.error("Personal details fetch error:", err);
    }
  };

  // Fetch locations of that agency
  const fetchAgencyInfo = async () => {
    try {
      if (user.agencyId) {
        const agencyResponse = await apiClient.get(
          `/agencies/${user.agencyId}`
        );

        const locationsResponse = await apiClient.get(
          `/agencies/${user.agencyId}/locations`
        );

        let locationsArray = [];
        if (Array.isArray(locationsResponse)) {
          locationsArray = locationsResponse;
        } else if (Array.isArray(locationsResponse.data)) {
          locationsArray = locationsResponse.data;
        } else {
          locationsArray = [];
        }
        const agencyData = {
          name: agencyResponse.data?.name || "",
          email: agencyResponse.data?.email || "",
          phone: agencyResponse.data?.phone || "",
          aboutUs: agencyResponse.data?.aboutUs || "",
          isActive: agencyResponse.data?.isActive ?? true,
          locations: locationsArray,
        };

        setAgencyInfo(agencyData);
        setInitialAgencyData(agencyData);
      }
    } catch (err) {
      setError("Failed to load agency information");
      console.error("Agency info fetch error:", err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchPersonalDetails(), fetchAgencyInfo()]);
    } catch (err) {
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = setInterval(
      () => setResendLeft((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(t);
  }, [resendLeft]);

  // Personal Details Handler
  const handlePersonalSave = async () => {
    setSaving(true);
    setError("");

    try {
      const editable = ["firstName", "lastName", "email", "phone"];
      const updateData = {};
      for (const key of editable) {
        const newVal = personalDetails[key];
        const oldVal = initialPersonalData[key];
        if (newVal !== oldVal) {
          if (key === "phone") {
            updateData.phone = newVal?.toString().trim()
              ? newVal.toString().trim()
              : null;
          } else {
            updateData[key] = (newVal ?? "").toString().trim();
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        notifications.show({
          title: "No Changes",
          message: "No changes detected to save",
          color: "blue",
          icon: <IconCheck size={16} />,
        });
        setPersonalEditMode(false);
        setSaving(false);
        return;
      }

      console.log("🔧 Sending personal update data:", updateData);

      const response = await apiClient.patch(
        `/agency-admins/${user.id}`,
        updateData
      );

      notifications.show({
        title: "Success",
        message: "Personal details updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      await fetchPersonalDetails();
      setPersonalEditMode(false);
    } catch (err) {
      console.error("❌ Personal update error:", err);
      const errorMessage =
        err.data?.error || err.message || "Failed to update personal details";
      setError(errorMessage);
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePersonalCancel = () => {
    setPersonalDetails(initialPersonalData);
    setPersonalEditMode(false);
    setError("");
  };

  // Agency Info Handler
  const handleAgencySave = async () => {
    setSaving(true);
    setError("");

    try {
      const updateData = {};
      Object.keys(agencyInfo).forEach((key) => {
        if (
          ["name", "email", "phone", "aboutUs"].includes(key) &&
          agencyInfo[key] !== initialAgencyData[key]
        ) {
          if (key === "phone") {
            if (agencyInfo[key].trim()) {
              updateData[key] = agencyInfo[key].trim();
            } else {
              updateData[key] = null;
            }
          } else {
            updateData[key] = agencyInfo[key].trim();
          }
        }
      });

      if (Object.keys(updateData).length === 0) {
        notifications.show({
          title: "No Changes",
          message: "No changes detected to save",
          color: "blue",
          icon: <IconCheck size={16} />,
        });
        setAgencyEditMode(false);
        setSaving(false);
        return;
      }

      console.log("🏢 Sending agency update data:", updateData);

      const response = await apiClient.patch(
        `/agencies/${user.agencyId}`,
        updateData
      );

      notifications.show({
        title: "Success",
        message: "Agency information updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      const updatedAgencyData = {
        ...agencyInfo,
        name: response.name || agencyInfo.name,
        email: response.email || agencyInfo.email,
        phone: response.phone || agencyInfo.phone,
        aboutUs: response.aboutUs || agencyInfo.aboutUs,
      };

      setAgencyInfo(updatedAgencyData);
      setInitialAgencyData(updatedAgencyData);
      setAgencyEditMode(false);
    } catch (err) {
      console.error("❌ Agency update error:", err);
      const errorMessage =
        err.data?.error || err.message || "Failed to update agency information";
      setError(errorMessage);
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAgencyCancel = () => {
    setAgencyInfo(initialAgencyData);
    setAgencyEditMode(false);
    setError("");
  };

  const handleAddLocation = async () => {
    if (!newLocation.address.trim()) {
      notifications.show({
        title: "Error",
        message: "Please enter an address",
        color: "red",
        icon: <IconX size={16} />,
      });
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post(
        `/agencies/${user.agencyId}/locations`,
        {
          address: newLocation.address.trim(),
        }
      );

      const newLocationObj = response.data || response;

      setAgencyInfo((prev) => ({
        ...prev,
        locations: [...prev.locations, newLocationObj],
      }));

      setNewLocation({ address: "" });
      setLocationModalOpen(false);

      notifications.show({
        title: "Success",
        message: "Location added successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to add location";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (location) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  // Close delete confirmation modal
  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setLocationToDelete(null);
    setDeleting(false);
  };

  // Confirm and execute location deletion
  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;

    setDeleting(true);
    try {
      await apiClient.delete(
        `/agencies/${user.agencyId}/locations/${locationToDelete.id}`
      );

      setAgencyInfo((prev) => ({
        ...prev,
        locations: prev.locations.filter((loc) => loc.id !== locationToDelete.id),
      }));

      notifications.show({
        title: "Success",
        message: "Location deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      // Handle the "location in use" error specifically
      if (err.response?.data?.error === "LOCATION_IN_USE") {
        notifications.show({
          title: "Cannot Delete Location",
          message:
            "This location is currently being used in lessons and cannot be deleted.",
          color: "orange",
          icon: <IconX size={16} />,
        });
      } else {
        const errorMessage =
          err.response?.data?.error || "Failed to delete location";
        notifications.show({
          title: "Error",
          message: errorMessage,
          color: "red",
          icon: <IconX size={16} />,
        });
      }
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setLocationToDelete(null);
    }
  };

  const handleInputChange = (section, field, value) => {
    if (section === "personal") {
      setPersonalDetails((prev) => ({ ...prev, [field]: value }));
    } else {
      setAgencyInfo((prev) => ({ ...prev, [field]: value }));
    }
    if (error) setError("");
  };

  const handleResendVerification = async () => {
    const to = personalDetails.email;
    try {
      setResending(true);
      const res = await apiClient.post(`/auth/resend-verification`, {
        email: to,
      });

      if (res?.ok === false && typeof res?.message === "string") {
        const m = res.message.match(/(\d+)s/i);
        if (m) setResendLeft(parseInt(m[1], 10));
        notifications.show({
          title: "Please wait",
          message: res.message,
          color: "yellow",
          icon: <IconX size={16} />,
        });
        return;
      }

      const retryMs = res?.retryInMs ?? 0;
      const seconds = Math.max(
        1,
        Math.ceil((retryMs || COOLDOWN * 1000) / 1000)
      );
      setResendLeft(seconds);

      notifications.show({
        title: "Verification email sent",
        message: `We sent a link to ${to}.`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.response?.data?.message || "Unable to resend right now",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "40px" }}
        >
          <Loader size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack spacing="lg">
          <Group justify="space-between" align="center">
            <Text size="xl" fw={700}>
              Agency Profile
            </Text>
          </Group>

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="personal">Personal Details</Tabs.Tab>
              <Tabs.Tab value="agency">Agency Information</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="personal" pt="md">
              <Stack spacing="md">
                <Group justify="space-between" align="center">
                  <Text size="lg" fw={600}>
                    Personal Information
                  </Text>
                  {!personalEditMode ? (
                    <Button
                      leftSection={<IconEdit size={16} />}
                      onClick={() => setPersonalEditMode(true)}
                      variant="light"
                    >
                      Edit Personal Details
                    </Button>
                  ) : (
                    <Group>
                      <Button
                        variant="subtle"
                        onClick={handlePersonalCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        leftSection={<IconCheck size={16} />}
                        onClick={handlePersonalSave}
                        loading={saving}
                        disabled={
                          !personalDetails.firstName.trim() ||
                          !personalDetails.lastName.trim() ||
                          !personalDetails.email.trim()
                        }
                      >
                        Save Changes
                      </Button>
                    </Group>
                  )}
                </Group>

                <Stack spacing="md" style={{ maxWidth: 500 }}>
                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      First Name
                    </Text>
                    {personalEditMode ? (
                      <TextInput
                        value={personalDetails.firstName}
                        onChange={(e) =>
                          handleInputChange(
                            "personal",
                            "firstName",
                            e.target.value
                          )
                        }
                        placeholder="Enter first name"
                        required
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {personalDetails.firstName || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Last Name
                    </Text>
                    {personalEditMode ? (
                      <TextInput
                        value={personalDetails.lastName}
                        onChange={(e) =>
                          handleInputChange(
                            "personal",
                            "lastName",
                            e.target.value
                          )
                        }
                        placeholder="Enter last name"
                        required
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {personalDetails.lastName || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Email Address
                    </Text>
                    {personalEditMode ? (
                      <TextInput
                        type="email"
                        value={personalDetails.email}
                        onChange={(e) =>
                          handleInputChange("personal", "email", e.target.value)
                        }
                        placeholder="Enter email address"
                        required
                      />
                    ) : (
                      <>
                        <Text size="md" style={{ padding: "8px 0" }}>
                          {personalDetails.email || "Not set"}
                        </Text>

                        <Group gap="xs" mt={4}>
                          {personalDetails.isActive ? (
                            <Badge
                              color="green"
                              variant="light"
                              leftSection={<IconCheck size={14} />}
                            >
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              color="yellow"
                              variant="light"
                              leftSection={<IconX size={14} />}
                            >
                              Verification required
                            </Badge>
                          )}

                          {!personalDetails.isActive && (
                            <Button
                              size="xs"
                              variant="light"
                              onClick={handleResendVerification}
                              loading={resending}
                              disabled={resendLeft > 0}
                            >
                              {resendLeft > 0
                                ? `Resend in ${resendLeft}s`
                                : "Resend verification email"}
                            </Button>
                          )}
                        </Group>
                      </>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Phone Number
                    </Text>
                    {personalEditMode ? (
                      <TextInput
                        value={personalDetails.phone}
                        onChange={(e) =>
                          handleInputChange("personal", "phone", e.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {personalDetails.phone || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      User Role
                    </Text>
                    <Text size="md" style={{ padding: "8px 0" }} color="dimmed">
                      {personalDetails.role || "agency"}
                    </Text>
                  </div>
                </Stack>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="agency" pt="md">
              <Stack spacing="md">
                    <Card withBorder padding="md">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text size="lg" fw={600}>Agency Branding</Text>
                          <Text size="sm" color="dimmed">
                            Customize your agency's colors and appearance
                          </Text>
                        </div>
                        <CustomizationComponent />
                      </Group>
                    </Card>
                    <Group justify="space-between" align="center">
                  <Text size="lg" fw={600}>
                    Agency Information
                  </Text>
                  {!agencyEditMode ? (
                    <Button
                      leftSection={<IconEdit size={16} />}
                      onClick={() => setAgencyEditMode(true)}
                      variant="light"
                    >
                      Edit Agency Info
                    </Button>
                  ) : (
                    <Group>
                      <Button
                        variant="subtle"
                        onClick={handleAgencyCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        leftSection={<IconCheck size={16} />}
                        onClick={handleAgencySave}
                        loading={saving}
                        disabled={
                          !agencyInfo.name.trim() || !agencyInfo.email.trim()
                        }
                      >
                        Save Changes
                      </Button>
                    </Group>
                  )}
                </Group>

                <Stack spacing="md" style={{ maxWidth: 500 }}>
                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Agency Name
                    </Text>
                    {agencyEditMode ? (
                      <TextInput
                        value={agencyInfo.name}
                        onChange={(e) =>
                          handleInputChange("agency", "name", e.target.value)
                        }
                        placeholder="Enter agency name"
                        required
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {agencyInfo.name || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Agency Email
                    </Text>
                    {agencyEditMode ? (
                      <TextInput
                        type="email"
                        value={agencyInfo.email}
                        onChange={(e) =>
                          handleInputChange("agency", "email", e.target.value)
                        }
                        placeholder="Enter agency email"
                        required
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {agencyInfo.email || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Phone Number
                    </Text>
                    {agencyEditMode ? (
                      <TextInput
                        value={agencyInfo.phone}
                        onChange={(e) =>
                          handleInputChange("agency", "phone", e.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <Text size="md" style={{ padding: "8px 0" }}>
                        {agencyInfo.phone || "Not set"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      About Us
                    </Text>
                    {agencyEditMode ? (
                      <Textarea
                        value={agencyInfo.aboutUs}
                        onChange={(e) =>
                          handleInputChange("agency", "aboutUs", e.target.value)
                        }
                        placeholder="Tell us about your agency..."
                        minRows={4}
                        maxRows={8}
                        autosize
                      />
                    ) : (
                      <Text
                        size="md"
                        style={{ padding: "8px 0", whiteSpace: "pre-wrap" }}
                      >
                        {agencyInfo.aboutUs || "No description provided"}
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Status
                    </Text>
                    <Badge
                      color={agencyInfo.isActive ? "green" : "red"}
                      variant="light"
                    >
                      {agencyInfo.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div>
                    <Group justify="space-between" align="center" mb={4}>
                      <Text size="sm" fw={500}>
                        Locations
                      </Text>
                      <Button
                        leftSection={<IconPlus size={16} />}
                        variant="subtle"
                        size="xs"
                        onClick={() => setLocationModalOpen(true)}
                      >
                        Add Location
                      </Button>
                    </Group>

                    {agencyInfo.locations.length === 0 ? (
                      <Text
                        size="md"
                        color="dimmed"
                        style={{ padding: "8px 0" }}
                      >
                        No locations added
                      </Text>
                    ) : (
                      <Stack spacing="xs">
                        {agencyInfo.locations.map((location) => (
                          <Box key={location.id}>
                            <Flex align="center" justify="space-between">
                              <Flex align="center" gap="sm">
                                <IconMapPin size={16} color="gray" />
                                <Text size="md">{location.address}</Text>
                              </Flex>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => handleDeleteClick(location)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Flex>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </div>

                  {user?.agencyId && (
                    <div>
                      <Text size="sm" fw={500} mb={4}>
                        Agency ID
                      </Text>
                      <Text
                        size="md"
                        style={{ padding: "8px 0" }}
                        color="dimmed"
                      >
                        {user.agencyId}
                      </Text>
                    </div>
                  )}
                </Stack>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Card>

      {/* Add Location Modal */}
      <Modal
        opened={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title="Add New Location"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Address"
            placeholder="Enter full address"
            value={newLocation.address}
            onChange={(e) => setNewLocation({ address: e.target.value })}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setLocationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLocation}
              loading={saving}
              leftSection={<IconPlus size={16} />}
            >
              Add Location
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={handleCancelDelete}
        title="Delete Location"
        size="md"
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete the location{" "}
            <Text component="span" fw={600}>
              "{locationToDelete?.address}"
            </Text>
            ? This action cannot be undone.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={handleCancelDelete}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleting}
              leftSection={<IconTrash size={16} />}
            >
              Delete Location
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}