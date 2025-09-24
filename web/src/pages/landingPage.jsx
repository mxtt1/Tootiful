import React from 'react';
import { Container, Group, Button, Text, Title, Box, Image } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import yongmanworking from '../assets/youngmanworking.jpg';
import logo from '../assets/tooty.png';
import aboutUs from './aboutUs';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header */}
            <Box
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}
            >
                <Container size="xl" py="md">
                    <Group justify="space-between" align="center">
                        {/* Logo */}
                        <Group align="center" spacing="xs">
                            <Image
                                src={logo}
                                alt="Tutiful Logo"
                                style={{
                                    height: '60px',   // increased from 40px
                                    width: 'auto',
                                    cursor: 'pointer'
                                }}
                                onClick={() => navigate('/')} // optional: navigate home on click
                            />
                        </Group>

                        {/* Navigation */}
                        <Group spacing="lg" align="center">
                            <Text
                                component="a"
                                href="#"
                                style={{
                                    color: '#333',
                                    textDecoration: 'none',
                                    fontSize: '16px',
                                    fontWeight: 500
                                }}
                            >
                                Home
                            </Text>
                            <Text
                                onClick={() => navigate('/aboutUs')}
                                style={{
                                    color: '#333',
                                    textDecoration: 'none',
                                    fontSize: '16px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                About Us
                            </Text>
                            <Button
                                variant="subtle"
                                onClick={() => navigate('/login')}
                                style={{
                                    color: '#667eea',
                                    fontSize: '16px'
                                }}
                            >
                                Log in
                            </Button>
                            <Button
                                onClick={() => navigate('/register')}
                                style={{
                                    backgroundColor: '#667eea',
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '8px 24px',
                                    fontSize: '16px'
                                }}
                            >
                                Register
                            </Button>
                        </Group>
                    </Group>
                </Container>
            </Box>

            {/* Main Content */}
            <Container
                size="xl"
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: '40px',
                    paddingBottom: '40px'
                }}
            >
                <Group
                    align="center"
                    justify="space-between"
                    grow
                    style={{
                        width: '100%',
                        flexWrap: 'wrap', // responsive stacking
                        gap: '40px',
                    }}
                >
                    {/* Left Side - Text */}
                    <Box style={{ flex: 1, minWidth: '300px', maxWidth: '600px' }}>
                        <Title
                            order={1}
                            style={{
                                fontSize: 'clamp(28px, 4vw, 48px)', // responsive font
                                lineHeight: 1.2,
                                marginBottom: '20px',
                                color: '#ffffffff'
                            }}
                        >
                            Let us do the heavy lifting

                            ,<br />
                            While you inspire students
                            .
                        </Title>
                        <Text size="lg" color="dark" style={{ marginTop: '10px' }}>
                            We simplify tutor management so you can focus on what matters most.
                        </Text>
                    </Box>

                    {/* Right Side - Image */}
                    <Box
                        style={{
                            flex: 1,
                            minWidth: '300px',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <Image
                            src={yongmanworking}
                            alt="Tutor working on laptop"
                            style={{
                                borderRadius: '16px',
                                width: '100%',
                                maxWidth: '500px',
                                height: 'auto',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                objectFit: 'cover'
                            }}
                        />
                    </Box>
                </Group>
            </Container>
        </Box>
    );
}