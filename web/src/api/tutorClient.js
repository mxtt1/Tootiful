class TutorClient {
    constructor() {
        this.baseURL = "http://127.0.0.1:8000"; // your local FastAPI port
    }

    async post(endpoint, data) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to fetch");
        }

        return response.json();
    }
}

export default new TutorClient();