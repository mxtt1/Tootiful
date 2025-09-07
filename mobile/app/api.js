const API_URL = "http://<IPAddress>:3000/api";

export const authApi = {
    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    },
    
    // Add other auth-related API calls here
    login: async (credentials) => {
        // ... login implementation
    }
};