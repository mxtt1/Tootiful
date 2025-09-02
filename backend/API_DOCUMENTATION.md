# Tuition Management API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
- Passwords are automatically hashed using bcrypt
- Login endpoints return user data without password field
- Password changes require current password verification

---

## Student Endpoints

### 1. Create Student
**POST** `/students`

#### Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phone": "12345678",
  "gradeLevel": "Grade 10"
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "12345678",
    "gradeLevel": "Grade 10",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z"
  },
  "message": "Student created successfully"
}
```

#### Validation Rules:
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `password`: Required, 6-255 characters
- `phone`: Optional, 8 characters
- `gradeLevel`: Optional string

---

### 2. Student Login
**POST** `/students/login`

#### Request Body:
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "12345678",
    "gradeLevel": "Grade 10",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z"
  },
  "message": "Student authenticated successfully"
}
```

#### Error Response (401 Unauthorized):
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get All Students
**GET** `/students`

#### Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `active` (optional): Filter by active status ("true" for active only)
- `gradeLevel` (optional): Filter by grade level

#### Examples:
```
GET /students?page=1&limit=5
GET /students?active=true
GET /students?gradeLevel=Grade%2010
GET /students?page=2&limit=5&active=true
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "12345678",
      "gradeLevel": "Grade 10",
      "isActive": true,
      "createdAt": "2025-09-02T10:30:00.000Z",
      "updatedAt": "2025-09-02T10:30:00.000Z"
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

### 4. Get Student by ID
**GET** `/students/:id`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "12345678",
    "gradeLevel": "Grade 10",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z"
  }
}
```

#### Error Response (404 Not Found):
```json
{
  "success": false,
  "message": "Student not found"
}
```

---

### 5. Update Student (Partial)
**PATCH** `/students/:id`

#### Request Body (partial update):
```json
{
  "firstName": "Jane",
  "gradeLevel": "Grade 11"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "12345678",
    "gradeLevel": "Grade 11",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T11:15:00.000Z"
  },
  "message": "Student updated successfully"
}
```

#### Notes:
- Password updates are not allowed through this endpoint
- Email uniqueness is validated if email is being updated

---

### 6. Change Student Password
**PATCH** `/students/:id/password`

#### Request Body:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

#### Error Response (400 Bad Request):
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

### 7. Deactivate Student
**PATCH** `/students/:id/deactivate`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "12345678",
    "gradeLevel": "Grade 10",
    "isActive": false,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T11:20:00.000Z"
  },
  "message": "Student deactivated successfully"
}
```

---

### 8. Delete Student
**DELETE** `/students/:id`

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

## Tutor Endpoints

### 1. Create Tutor
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
    "hourlyRate": 45.50
  },
  "subjects": [
    {
      "subjectId": 1,
      "experienceLevel": "advanced"
    },
    {
      "subjectId": 2,
      "experienceLevel": "intermediate"
    }
  ]
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "phone": "87654321",
    "hourlyRate": "45.50",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z",
    "subjects": [
      {
        "id": 1,
        "name": "Mathematics",
        "description": "Algebra, Geometry, Calculus, Statistics",
        "category": "Science",
        "TutorSubject": {
          "experienceLevel": "advanced"
        }
      },
      {
        "id": 2,
        "name": "English",
        "description": "Literature, Grammar, Writing",
        "category": "Languages",
        "TutorSubject": {
          "experienceLevel": "intermediate"
        }
      }
    ]
  },
  "message": "Tutor created successfully"
}
```

#### Validation Rules:
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `password`: Required, 6-255 characters
- `phone`: Optional, 8 characters
- `hourlyRate`: Required, decimal (0-9999.99)
- `experienceLevel`: Must be one of: "beginner", "intermediate", "advanced", "expert"

---

### 2. Tutor Login
**POST** `/tutors/login`

#### Request Body:
```json
{
  "email": "alice.smith@example.com",
  "password": "securePassword123"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "phone": "87654321",
    "hourlyRate": "45.50",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z"
  },
  "message": "Tutor authenticated successfully"
}
```

---

### 3. Get All Tutors (with Filters)
**GET** `/tutors`

#### Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `active` (optional): Filter by active status ("true" for active only)
- `minRate` (optional): Minimum hourly rate
- `maxRate` (optional): Maximum hourly rate
- `subject` (optional): Search by subject name (partial match)
- `experience` (optional): Filter by experience level ("beginner", "intermediate", "advanced", "expert")

#### Examples:
```
GET /tutors
GET /tutors?page=1&limit=5
GET /tutors?active=true
GET /tutors?minRate=20&maxRate=50
GET /tutors?subject=Mathematics
GET /tutors?subject=Math&experience=advanced
GET /tutors?subject=Science&experience=expert&minRate=40&maxRate=80
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@example.com",
      "phone": "87654321",
      "hourlyRate": "45.50",
      "isActive": true,
      "createdAt": "2025-09-02T10:30:00.000Z",
      "updatedAt": "2025-09-02T10:30:00.000Z",
      "subjects": [
        {
          "id": 1,
          "name": "Mathematics",
          "description": "Algebra, Geometry, Calculus, Statistics",
          "category": "Science",
          "TutorSubject": {
            "experienceLevel": "advanced"
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

### 4. Get Tutor by ID
**GET** `/tutors/:id`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "phone": "87654321",
    "hourlyRate": "45.50",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T10:30:00.000Z",
    "subjects": [
      {
        "id": 1,
        "name": "Mathematics",
        "description": "Algebra, Geometry, Calculus, Statistics",
        "category": "Science",
        "TutorSubject": {
          "experienceLevel": "advanced"
        }
      }
    ]
  }
}
```

---

### 5. Update Tutor (Partial)
**PATCH** `/tutors/:id`

#### Request Body:
```json
{
  "tutorData": {
    "hourlyRate": 55.00
  },
  "subjects": [
    {
      "subjectId": 1,
      "experienceLevel": "expert"
    },
    {
      "subjectId": 3,
      "experienceLevel": "advanced"
    }
  ]
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "phone": "87654321",
    "hourlyRate": "55.00",
    "isActive": true,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T11:45:00.000Z",
    "subjects": [
      {
        "id": 1,
        "name": "Mathematics",
        "TutorSubject": {
          "experienceLevel": "expert"
        }
      },
      {
        "id": 3,
        "name": "Science",
        "TutorSubject": {
          "experienceLevel": "advanced"
        }
      }
    ]
  },
  "message": "Tutor updated successfully"
}
```

#### Notes:
- Password updates are not allowed through this endpoint
- Subjects array is optional - if not provided, subjects remain unchanged
- If subjects array is provided, it replaces all existing subjects

---

### 6. Change Tutor Password
**PATCH** `/tutors/:id/password`

#### Request Body:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 7. Deactivate Tutor
**PATCH** `/tutors/:id/deactivate`

#### Response (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "phone": "87654321",
    "hourlyRate": "45.50",
    "isActive": false,
    "createdAt": "2025-09-02T10:30:00.000Z",
    "updatedAt": "2025-09-02T11:50:00.000Z"
  },
  "message": "Tutor deactivated successfully"
}
```

---

### 8. Delete Tutor
**DELETE** `/tutors/:id`

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Tutor deleted successfully"
}
```

---

### 9. Create Subject
**POST** `/tutors/subjects`

#### Request Body:
```json
{
  "name": "Physics",
  "description": "Mechanics, Thermodynamics, Electromagnetism",
  "category": "Science"
}
```

#### Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Physics",
    "description": "Mechanics, Thermodynamics, Electromagnetism",
    "category": "Science",
    "isActive": true,
    "createdAt": "2025-09-02T12:00:00.000Z",
    "updatedAt": "2025-09-02T12:00:00.000Z"
  },
  "message": "Subject created successfully"
}
```

---

## Common Error Responses

### Validation Error (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation len on password failed"
}
```

### Unique Constraint Error (409 Conflict):
```json
{
  "success": false,
  "message": "Student with this email already exists"
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

## Authentication & Security Notes

1. **Password Hashing**: All passwords are automatically hashed using bcrypt with 12 salt rounds
2. **Password Exclusion**: Passwords are never returned in API responses
3. **Validation**: Sequelize model validation is applied to all fields
4. **Unique Constraints**: Email addresses must be unique across students and tutors
5. **Soft Deletes**: Use deactivate endpoints for soft deletes, DELETE endpoints for hard deletes
