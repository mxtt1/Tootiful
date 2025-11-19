import React, { useState, useRef, useEffect } from "react";
import {
    Container,
    Stack,
    Title,
    Card,
    Group,
    TextInput,
    Button,
    Loader,
    Text,
    Badge,
    ScrollArea,
    Avatar,
    Paper,
    Alert,
    ThemeIcon,
} from "@mantine/core";
import {
    IconSend,
    IconRobot,
    IconUser,
    IconAlertCircle,
    IconBrandPython,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import tutorClient from "../../api/tutorClient"; // ✅ use your FastAPI client here

export default function ResumeScreener() {
    // --- Chat states ---
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: "bot",
            content:
                "Hello! 👋 I'm your AI tutor recommender. Ask me questions about finding the best tutors for your needs, and I'll search through our database to find the perfect matches!",
            timestamp: new Date(),
        },
    ]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const scrollAreaRef = useRef(null);
    const messageIdRef = useRef(2);

    // --- Auto-scroll to bottom when new messages arrive ---
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollToBottom = () => {
                const scrollElement = scrollAreaRef.current?.querySelector(
                    "[data-scroll-area-viewport]"
                );
                if (scrollElement) {
                    scrollElement.scrollTop = scrollElement.scrollHeight;
                }
            };
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    // --- Send query to FastAPI backend ---
    const sendQuery = async () => {
        if (!query.trim()) {
            notifications.show({
                title: "Empty Query",
                message: "Please enter a question",
                color: "yellow",
            });
            return;
        }

        const userMessage = {
            id: messageIdRef.current++,
            type: "user",
            content: query,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setQuery("");
        setLoading(true);
        setError(null);

        try {
            console.log("📤 Sending query to FastAPI:", query);

            // ✅ Send to your local FastAPI /recommend endpoint via tutorClient
            const data = await tutorClient.post("/recommend", { question: query });

            console.log("📥 API Response:", data);

            const aiResponse = data.response || data.message || "";
            const tutors = data.tutors || [];
            const numTutors = data.num_tutors || 0;

            if (!aiResponse) throw new Error("No response received from the AI model");

            const botMessage = {
                id: messageIdRef.current++,
                type: "bot",
                content: aiResponse,
                tutors,
                numTutors,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);

            notifications.show({
                title: "Success",
                message: `Found ${tutors.length} tutors matching your criteria`,
                color: "green",
            });
        } catch (err) {
            console.error("❌ Error:", err);

            let errorMessage = "Failed to get recommendations. Please try again.";
            if (err.response?.data?.message) errorMessage = err.response.data.message;
            else if (err.data?.message) errorMessage = err.data.message;
            else if (err.data?.detail) errorMessage = err.data.detail;
            else if (err.message) errorMessage = err.message;

            const errorMsg = {
                id: messageIdRef.current++,
                type: "error",
                content: errorMessage,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, errorMsg]);
            setError(errorMessage);

            notifications.show({
                title: "Error",
                message: errorMessage,
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendQuery();
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: 1,
                type: "bot",
                content:
                    "Hello! 👋 I'm your AI tutor recommender. Ask me questions about finding the best tutors for your needs, and I'll search through our database to find the perfect matches!",
                timestamp: new Date(),
            },
        ]);
        messageIdRef.current = 2;
        setError(null);
    };

    // --- Message bubble component ---
    const MessageBubble = ({ message }) => {
        const isUser = message.type === "user";
        const isError = message.type === "error";

        return (
            <Group
                justify={isUser ? "flex-end" : "flex-start"}
                mb="md"
                style={{ width: "100%" }}
            >
                {!isUser && (
                    <Avatar
                        size="md"
                        radius="xl"
                        style={{
                            background: isError
                                ? "#ff6b6b"
                                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                    >
                        {isError ? <IconAlertCircle size={20} /> : <IconRobot size={20} />}
                    </Avatar>
                )}

                <Stack spacing={0} style={{ maxWidth: "70%" }}>
                    <Paper
                        p="md"
                        radius="lg"
                        style={{
                            background: isUser ? "#4c6ef5" : isError ? "#ffe3e3" : "#f1f3f5",
                            color: isUser ? "white" : isError ? "#c92a2a" : "black",
                        }}
                    >
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {message.content}
                        </Text>

                        {/* --- Tutor cards if available --- */}
                        {message.tutors && message.tutors.length > 0 && (
                            <Stack spacing="md" mt="lg">
                                <Text size="xs" fw={600} color={isUser ? "white" : "black"}>
                                    📌 Found {message.tutors.length} tutors:
                                </Text>

                                <Stack spacing="xs">
                                    {message.tutors.map((tutor, index) => (
                                        <Card
                                            key={tutor.id || index}
                                            p="sm"
                                            radius="md"
                                            style={{
                                                background: isUser
                                                    ? "rgba(255,255,255,0.1)"
                                                    : "white",
                                                border: isUser
                                                    ? "1px solid rgba(255,255,255,0.2)"
                                                    : "1px solid #dee2e6",
                                            }}
                                        >
                                            <Group justify="space-between" mb="xs">
                                                <div>
                                                    <Text
                                                        fw={500}
                                                        size="sm"
                                                        color={isUser ? "white" : "black"}
                                                    >
                                                        #{index + 1} {tutor.name || "Unknown"}
                                                    </Text>
                                                </div>
                                                {tutor.id && (
                                                    <Badge
                                                        size="sm"
                                                        variant="light"
                                                        color={isUser ? "gray" : "blue"}
                                                    >
                                                        {"Resume Id: " + tutor.id.slice(0, 8)}
                                                    </Badge>
                                                )}
                                            </Group>

                                            <Stack spacing="xs">
                                                {tutor.region && (
                                                    <Text size="xs" color="dimmed">
                                                        <strong>🌍 Region:</strong> {tutor.region}
                                                    </Text>
                                                )}
                                                {tutor.address && (
                                                    <Text size="xs" color="dimmed">
                                                        <strong>📍 Address:</strong> {tutor.address}
                                                    </Text>
                                                )}
                                                {tutor.institution && (
                                                    <Text size="xs" color="dimmed">
                                                        <strong>🏫 Institution:</strong> {tutor.institution}
                                                    </Text>
                                                )}
                                            </Stack>
                                        </Card>
                                    ))}
                                </Stack>
                            </Stack>
                        )}
                    </Paper>

                    <Text size="xs" color="dimmed" mt="xs">
                        {message.timestamp.toLocaleTimeString()}
                    </Text>
                </Stack>

                {isUser && (
                    <Avatar size="md" radius="xl" color="blue">
                        <IconUser size={20} />
                    </Avatar>
                )}
            </Group>
        );
    };

    // --- UI ---
    return (
        <Container
            size="md"
            py="xl"
            px={{ base: "md", sm: "lg", md: "xl" }}
            style={{ width: "100%", maxWidth: "100%" }}
        >
            <Stack spacing="lg" style={{ minHeight: "100vh" }}>
                {/* Header */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group justify="space-between" align="center">
                        <div>
                            <Title
                                order={2}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    flexWrap: "wrap",
                                }}
                            >
                                <ThemeIcon
                                    size="lg"
                                    radius="md"
                                    variant="gradient"
                                    gradient={{ from: "indigo", to: "cyan" }}
                                >
                                    <IconBrandPython size={24} />
                                </ThemeIcon>
                                AI Resume Screener
                            </Title>
                            <Text size="sm" color="dimmed" mt="xs">
                                Find the perfect tutors using AI-powered recommendations
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Chat area */}
                <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "400px",
                    }}
                >
                    <ScrollArea
                        style={{ flex: 1, marginBottom: "1rem" }}
                        ref={scrollAreaRef}
                        type="auto"
                    >
                        <Stack spacing="md" p="md">
                            {messages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}

                            {loading && (
                                <Group justify="flex-start" mb="md">
                                    <Avatar
                                        size="md"
                                        radius="xl"
                                        style={{
                                            background:
                                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        }}
                                    >
                                        <IconRobot size={20} />
                                    </Avatar>
                                    <Paper p="md" radius="lg" style={{ background: "#f1f3f5" }}>
                                        <Group spacing="xs">
                                            <Loader size="sm" />
                                            <Text size="sm" color="dimmed">
                                                🔍 Analyzing resumes and finding tutors...
                                            </Text>
                                        </Group>
                                    </Paper>
                                </Group>
                            )}
                        </Stack>
                    </ScrollArea>

                    {error && (
                        <Alert
                            color="red"
                            title="Error"
                            icon={<IconAlertCircle />}
                            mb="md"
                            onClose={() => setError(null)}
                            withCloseButton
                        >
                            {error}
                        </Alert>
                    )}
                </Card>

                {/* Input area */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack spacing="md">
                        <TextInput
                            placeholder="Ask for tutor recommendations... e.g., 'Find me a tutor who teaches Python and has experience with beginners'"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={loading}
                            rightSection={
                                loading ? (
                                    <Loader size="xs" />
                                ) : (
                                    <Button
                                        compact
                                        onClick={sendQuery}
                                        disabled={!query.trim() || loading}
                                        leftSection={<IconSend size={16} />}
                                    >
                                        Send
                                    </Button>
                                )
                            }
                        />

                        <Group justify="space-between">
                            <Text size="xs" color="dimmed">
                                💡 Tip: Be specific about your tutor needs for better
                                recommendations
                            </Text>
                            <Button
                                variant="subtle"
                                size="xs"
                                onClick={clearChat}
                                disabled={loading}
                            >
                                Clear Chat
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    );
}
