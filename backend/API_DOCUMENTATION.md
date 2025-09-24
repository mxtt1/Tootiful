# Tuition Management API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

The API uses **JWT-based authentication** with **HTTP-only cookies** for refresh tokens:

- **Access Tokens**: Short-lived JWT tokens (15 minutes) sent in Authorization header
- **Refresh Tokens**: Long-lived opaque tokens (7 days) stored in HTTP-only cookies
- **Password Security**: All passwords are hashed using bcrypt with 12 salt rounds

### Authentication Flow:
1. Login to get access token (refresh token set automatically in cookie)
2. Use access token in `Authorization: Bearer <token>` header for protected routes
3. When access token expires, call `/auth/refresh` (cookie sent automatically)
4. Logout to revoke tokens

---

## Authentication Endpoints


### 1. Unified Login
**POST** `/auth/login`

#### Request Body:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Query Parameters (optional):
- `admin=true` — If present, login is restricted to admin users only.

**Examples:**
- Regular user login:
  `POST /auth/login`
- Admin login:
  `POST /auth/login?admin=true`

#### Response (200 OK):
```json
{
  "accessToken": "<JWT access token>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student" // or "admin" or "tutor"
  }
}
```

#### Notes:
- Refresh token is automatically set as HTTP-only cookie
- Cookie settings: `httpOnly: true, secure: true (production), sameSite: 'strict'`
- If `admin=true` is set, only users with role `admin` can log in; other roles will be rejected.
- If `admin` is not set, only non-admin users can log in; admin accounts will be rejected.

### 3. Refresh Access Token
**POST** `/auth/refresh`

#### Request:
- No body required
- Refresh token sent automatically via cookie
- Must include `credentials: 'include'` in fetch requests

#### Response (200 OK):
```json
{
  "accessToken": "<JWT access token>"
}
```

#### Error Response (400 Bad Request):
```json
{
  "success": false,
  "message": "Refresh token is required"
}
```

---

### 4. Logout (Single Device)
**POST** `/auth/logout`

#### Request:
- No body required
- Refresh token from cookie used automatically

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Logout All Devices
**POST** `/auth/logout-all`

#### Headers Required:
```
Authorization: Bearer <access_token>
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

#### Notes:
- Requires valid access token
- Revokes ALL refresh tokens for the user
- Logs out from all devices/browsers

---

### 6. Forgot Password (Request OTP)
**POST** `/auth/forgot-password`

#### Request Body:
```json
{
  "email": "user@example.com"
}
```

#### Response (200 OK):
```json
{
  "message": "OTP sent to your email."
}
```

#### Error Response (400 Bad Request):
```json
{
  "message": "No account found with that email."
}
```

---

### 7. Resend OTP
**POST** `/auth/resend-otp`

#### Request Body:
```json
{
  "email": "user@example.com"
}
```

#### Response (200 OK):
```json
{
  "message": "If the account exists, we've sent a code.",
  "throttled": false,
  "retryInMs": 0
}
```

---

### 8. Verify OTP
**POST** `/auth/verify-otp`

#### Request Body:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Response (200 OK):
```json
{
  "resetToken": "<reset token>"
}
```

#### Error Response (400 Bad Request):
```json
{
  "message": "Invalid or expired code."
}
```

---

### 9. Reset Password
**POST** `/auth/reset-password`

#### Request Body:
```json
{
  "email": "user@example.com",
  "resetToken": "<reset token>",
  "newPassword": "newSecurePassword123"
}
```

#### Response (200 OK):
```json
{
  "message": "Password updated."
}
```

#### Error Response (400 Bad Request):
```json
{
  "message": "Invalid or expired reset token."
}
```

---

## Student Endpoints

### 1. Create Student (Registration)
**POST** `/students`

#### Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phone": "12345678",
  "gradeLevel": "secondary-1"
}
```

#### Response (201 Created):
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "12345678",
  "gradeLevel": "secondary-1",
  "dateOfBirth": "2002-12-12",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

#### Validation Rules:
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `password`: Required, 6-255 characters
- `phone`: Optional, 8 characters
- `gradeLevel`: Optional, must be valid enum value
- `dateOfBirth`: Optional, must be in YYYY-MM-DD format, must be in the past, above 18 years

---

### 2. Get All Students
**GET** `/students`

#### Query Parameters:
- `page` (optional): Page number (no default)
- `limit` (optional): Items per page (no default)
- `active` (optional): Filter by active status ("true" for active only)
- `gradeLevel` (optional): Multiple values supported

#### Examples:
```
GET /students?page=1&limit=5
GET /students?active=true
GET /students?gradeLevel=secondary-1&gradeLevel=secondary-2
```

#### Response (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "12345678",
      "gradeLevel": "secondary-1",
      "dateOfBirth": "2002-12-12", 
      "isActive": true,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. Get Student by ID
**GET** `/students/:id`

#### Response (200 OK):
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "12345678",
  "gradeLevel": "secondary-1",
  "dateOfBirth": "2002-12-12",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

---



### 4. Update Student (Partial)
**PATCH** `/students/:id`

#### Request Body (JSON):
- Send all changed fields as JSON.
- If updating the profile image, include the public image URL as a string in the `image` field.

**Example:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "gradeLevel": "secondary-2",
  "phone": "98765432",
  "dateOfBirth": "2002-12-12",
  "image": "https://your-supabase-url/storage/v1/object/public/avatars/student_1.jpg" // optional, only if updating image
}
```

#### Response (200 OK):
```json
{
  "id": 1,
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "98765432",
  "gradeLevel": "secondary-2",
  "dateOfBirth": "2002-12-12",
  "image": "https://your-supabase-url/storage/v1/object/public/avatars/student_1.jpg",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T11:15:00.000Z"
}
```

#### Notes:
- Password updates are not allowed through this endpoint
- Email uniqueness is validated if email is being updated
- If no image field is sent, the existing image remains unchanged

---

### 5. Change Student Password
**PATCH** `/students/:id/password`

#### Request Body:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response (200 OK):
```
Status: 200 (no body)
```

---

### 6. Delete Student
**DELETE** `/students/:id`

#### Response (200 OK):
```
Status: 200 (no body)
```

---


### 7. Update Student Active/Suspended Status
**PATCH** `/students/:id`

#### Request (partial update):
Send fields such as `isActive` or `isSuspended` in the PATCH request body or form data to update status.

**Example:**
```json
{
  "isActive": false,
  "isSuspended": true
}
```

#### Response (200 OK):
Returns the updated student object.

#### Notes:
- There is no separate /deactivate endpoint; use PATCH to update status fields.

## Tutor Endpoints

### 1. Create Tutor (Registration)
**POST** `/tutors`

#### Request Body:
```json
{
  "tutorData": {
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "password": "securePassword123",
    "phone": "87654321",
    "dateOfBirth": "2002-12-12"
    
  },
  "subjects": [
    {
      "subjectId": 1,
      "experienceLevel": "advanced",
      "hourlyRate": 45
    },
    {
      "subjectId": 2,
      "experienceLevel": "intermediate",
      "hourlyRate": 45
    }
  ]
}
```

#### Response (201 Created):
```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.smith@example.com",
  "phone": "87654321",
  "hourlyRate": "45.50",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "subjects": [
    {
      "id": 1,
      "name": "Mathematics",
      "description": "Algebra, Geometry, Calculus",
      "category": "STEM",
      "TutorSubject": {
        "experienceLevel": "advanced",
        "hourlyRate": 45
      }
    }
  ]
}
```

#### Validation Rules:
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters  
- `email`: Required, valid email format, unique
- `password`: Required, 6-255 characters
- `phone`: Optional, 8 characters
- `dateOfBirth`: Optional, must be in YYYY-MM-DD format, must be in the past, above 18 years
- `subjects`: An array of subject objects with:
    - `experienceLevel`: Must be one of: "beginner", "intermediate", "advanced", "expert",
    - `hourlyRate`: Optional, integer (1-1000)

---

### 2. Get All Tutors (with Filters)
**GET** `/tutors`

#### Query Parameters:
- `page` (optional): Page number (no default)
- `limit` (optional): Items per page (no default)
- `active` (optional): Filter by active status ("true" for active only)
- `minRate` (optional): Minimum hourly rate
- `maxRate` (optional): Maximum hourly rate
- `subject` (optional): Multiple subjects supported (partial match for single, exact match for multiple)

#### Examples:
```
GET /tutors
GET /tutors?page=1&limit=5
GET /tutors?active=true
GET /tutors?minRate=20&maxRate=50
GET /tutors?subject=Math
GET /tutors?subject=Mathematics&subject=Physics
GET /tutors?subject=Science&minRate=40&maxRate=80
```

#### Response (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@example.com",
      "phone": "87654321",
      "isActive": true,
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z",
      "subjects": [
        {
          "id": 1,
          "name": "Mathematics",
          "category": "STEM",
          "TutorSubject": {
            "experienceLevel": "advanced",
            "hourlyRate": 45
          }
        }
      ]
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

### 3. Get Tutor by ID
**GET** `/tutors/:id`

#### Response (200 OK):
```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.smith@example.com",
  "phone": "87654321",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z",
  "subjects": [
    {
      "id": 1,
      "name": "Mathematics",
      "category": "STEM",
      "TutorSubject": {
        "experienceLevel": "advanced",
        "hourlyRate": 45
      }
    }
  ]
}
```

---



### 4. Update Tutor (Partial)
**PATCH** `/tutors/:id`

#### Request Body (JSON):
- Send all changed fields as JSON.
- If updating the profile image, include the public image URL as a string in the `image` field.
- For subjects, send as a JSON array in the `subjects` field.

**Example:**
```json
{
  "tutorData": {
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "image": "https://your-supabase-url/storage/v1/object/public/avatars/tutor_1.jpg" // optional, only if updating image
  },
  "subjects": [
    {"subjectId":1,"experienceLevel":"expert","hourlyRate":45},
    {"subjectId":3,"experienceLevel":"advanced","hourlyRate":45}
  ]
}
```

#### Response (200 OK):
```json
{
  "id": 1,
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.smith@example.com",
  "phone": "87654321",
  "isActive": true,
  "createdAt": "2025-01-20T10:30:00.000Z",
  "updatedAt": "2025-01-20T11:45:00.000Z",
  "image": "https://your-supabase-url/storage/v1/object/public/avatars/tutor_1.jpg",
  "subjects": [
    {
      "id": 1,
      "name": "Mathematics",
      "category": "STEM",
      "TutorSubject": {
        "experienceLevel": "expert",
        "hourlyRate": 45
      }
    }
  ]
}
```

#### Notes:
- Password updates are not allowed through this endpoint
- Email uniqueness is validated if email is being updated
- If no image field is sent, the existing image remains unchanged

---

### 5. Change Tutor Password
**PATCH** `/tutors/:id/password`

#### Request Body:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response (200 OK):
```
Status: 200 (no body)
```

---

### 6. Delete Tutor
**DELETE** `/tutors/:id`

#### Response (200 OK):
```
Status: 200 (no body)
```

---


### 7. Update Tutor Active/Suspended Status
**PATCH** `/tutors/:id`

#### Request (partial update):
Send fields such as `isActive` or `isSuspended` in the PATCH request body or form data to update status.

**Example:**
```json
{
  "isActive": false,
  "isSuspended": true
}
```

#### Response (200 OK):
Returns the updated tutor object.

#### Notes:
- There is no separate /deactivate endpoint; use PATCH to update status fields.

### 8. Get All Subjects
**GET** `/tutors/subjects/all`

#### Response (200 OK):
```json
{
  "id": 1,
  "name": "Mathematics",
  "description": "Algebra, Geometry, Calculus",
  "category": "STEM",
  "gradeLevel": "Secondary 4",
  "isActive": true,
  "createdAt": "2025-01-20T09:00:00.000Z",
  "updatedAt": "2025-01-20T09:00:00.000Z"
}
```

---

### 9. Create Subject
**POST** `/tutors/subjects`

#### Request Body:
```json
{
  "name": "Chemistry",
  "description": "Organic, Inorganic, Physical Chemistry",
  "category": "STEM",
  "gradeLevel": "Secondary 4"
}
```

#### Response (201 Created):
```json
{
  "id": 3,
  "name": "Chemistry",
  "description": "Organic, Inorganic, Physical Chemistry",
  "category": "STEM",
  "gradeLevel": "Secondary 4",
  "isActive": true,
  "createdAt": "2025-01-20T12:00:00.000Z",
  "updatedAt": "2025-01-20T12:00:00.000Z"
}
```

---

## Common Error Responses

### Authentication Required (401 Unauthorized):
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Invalid/Expired Token (403 Forbidden):
```json
{
  "success": false,
  "message": "Invalid or expired access token"
}
```

### Validation Error (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation len on password failed",
  "type": "ValidationError"
}
```

### Unique Constraint Error (409 Conflict):
```json
{
  "success": false,
  "message": "This value already exists",
  "type": "UniqueConstraintError"
}
```

### Not Found Error (404 Not Found):
```json
{
  "success": false,
  "message": "Student not found"
}
```

### Server Error (500 Internal Server Error):
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Security & Implementation Notes

1. **JWT Tokens**: Access tokens contain `userId`, `userType`, and `type` fields
2. **Refresh Tokens**: Opaque tokens stored as SHA-256 hashes in database
3. **Cookie Security**: HTTP-only, Secure (production), SameSite=strict
4. **Password Exclusion**: Passwords never returned in API responses
5. **Multivalued Queries**: Support for multiple values in query parameters (e.g., `?gradeLevel=secondary-1&gradeLevel=secondary-2`)
6. **Database Constraints**: Unique email constraints prevent duplicate registrations
7. **Soft Deletes**: Use deactivate endpoints for soft deletes, DELETE for hard deletes

## Frontend Integration

### Cookie Handling:
- Include `credentials: 'include'` in all fetch requests
- Refresh tokens handled automatically by browser
- No need to manually manage refresh tokens

### Error Handling:
- 401 responses should trigger automatic token refresh
- 403 responses after refresh should redirect to login
- Implement reactive refresh pattern for best UX
```

