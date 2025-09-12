class ApiClient {
    constructor() {
        // For web apps, we can use relative URLs in production and localhost in development
        this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
        this.accessToken = null;
        this.loadTokenFromStorage();

        if (import.meta.env.VITE_DEBUG === 'true') {
            console.log('API Client initialized with baseURL:', this.baseURL);
        }
    }

    // Load access token from localStorage (web equivalent of AsyncStorage)
    async loadTokenFromStorage() {
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                this.accessToken = token;
            }
        } catch (error) {
            console.error('Failed to load token from storage:', error);
        }
    }

    // Set access token
    async setAccessToken(token) {
        this.accessToken = token;
        try {
            localStorage.setItem('accessToken', token);
        } catch (error) {
            console.error('Failed to save token to storage:', error);
        }
    }

    // Clear access token
    async clearAccessToken() {
        this.accessToken = null;
        try {
            localStorage.removeItem('accessToken');
        } catch (error) {
            console.error('Failed to remove token from storage:', error);
        }
    }

    // Core HTTP request method
    async request(endpoint, options = {}, isRetry = false) {
        const url = `${this.baseURL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.accessToken) {
            headers.Authorization = `Bearer ${this.accessToken}`;
        }

        const config = {
            ...options,
            headers,
            // credentials: 'include', // Include cookies for refresh tokens
        };

        try {
            if (import.meta.env.VITE_DEBUG === 'true') {
                console.log('Making request to:', url);
            }

            const response = await fetch(url, config);

            // Handle 401 - try refresh token
            if (response.status === 401 && !isRetry && endpoint !== '/auth/refresh') {
                try {
                    await this.refreshToken();
                    return await this.request(endpoint, options, true);
                } catch (refreshError) {
                    await this.clearAccessToken();
                    window.location.href = '/login'; // Redirect to login
                    throw new Error('Session expired. Please log in again.');
                }
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `HTTP error! status: ${response.status}` };
                }

                const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return { success: true };
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // HTTP methods
    async get(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'GET', headers });
    }

    async post(endpoint, data = null, headers = {}) {
        const config = { method: 'POST', headers };
        if (data) config.body = JSON.stringify(data);
        return this.request(endpoint, config);
    }

    async patch(endpoint, data = null, headers = {}) {
        const config = { method: 'PATCH', headers };
        if (data) config.body = JSON.stringify(data);
        return this.request(endpoint, config);
    }

    async delete(endpoint, headers = {}) {
        return this.request(endpoint, { method: 'DELETE', headers });
    }

    // Auth methods
    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        if (response.accessToken) {
            await this.setAccessToken(response.accessToken);
        }
        return response;
    }

    async refreshToken() {
        try {
            const response = await this.post('/auth/refresh');
            if (response.accessToken) {
                await this.setAccessToken(response.accessToken);
            }
            return response;
        } catch (error) {
            await this.clearAccessToken();
            throw error;
        }
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            await this.clearAccessToken();
        }
    }
}

export default new ApiClient();