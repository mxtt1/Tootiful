// validate first name / last name
export const validateName = (name) => {
    if (!name) return "Name is required";
    if (name.length < 2 || name.length > 50) return "Name must be between 2 to 50 characters.";
    return null;
};

// validate date of birth (YYYY-MM-DD)
export const validateDateOfBirth = (date) => {
  if (date) {
    
    // Check if date is valid
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "Invalid date";
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); //ignore time
    if (dateObj >= today) return "Date must be in the past";
    
    // Check if age is reasonable (at least 18 years old)
    const minAgeDate = new Date();
    minAgeDate.setFullYear(minAgeDate.getFullYear() - 18);
    if (dateObj > minAgeDate) return "Must be at least 18 years old";
  }
    return null;
};

// validate email
export const validateEmail = (email) => {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/; //need to have @ in the middle of characters/numbers 
  // need to have .com or .org at the end

  if (!email) return "Email is required.";
  if (!emailRegex.test(email)) {
    return "Invalid email format. Please enter a valid email like happy@example.com.";
  }
  
  return null;
};


// validate phone
export const validatePhone = (phone) => {
  if (phone && phone.length > 0) {
    if (phone.length !== 8) return "Phone number must be 8 digits.";
    if (!/^\d+$/.test(phone)) return "Phone number must contain only digits."; 
  }
  return null; 
};

// validate password
export const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 6 || password.length > 255) return "Password must be between 6 to 255 characters.";
  return null;
};

// validate hourlyRate
export const validateHourlyRate = (hourlyRate) => {
  if (hourlyRate) {
    const rate = Number(hourlyRate);
    if (isNaN(rate)) return "Must be a valid number";
    if (rate < 0) return "Cannot be negative";
    if (rate > 1000) return "Cannot exceed $1000";
    if (!Number.isInteger(rate)) return "Must be a whole number";
  }
    return null;
};