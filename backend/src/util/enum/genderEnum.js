const genderEnum = Object.freeze({
    male: 'male',
    female: 'female'
});

export const getAllGenders = () => Object.values(genderEnum);
export const isValidGender = (gender) => getAllGenders().includes(gender);

export default genderEnum;