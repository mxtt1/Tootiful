// validate first name / last name
export const validateName = (name) => {
    if (!name) return "Name is required";
    if (name.length < 2 || name.length > 50) return "Name must be between 2 to 50 characters.";
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
  if (!phone) return "Phone number is required."; 
  if (phone.length !== 8) return "Phone number must be 8 digits.";
  if (!/^\d+$/.test(phone)) return "Phone number must contain only digits."; 
  return null; 
};

// validate password
export const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 6 || password.length > 255) return "Password must be between 6 to 255 characters.";
  return null;
};

