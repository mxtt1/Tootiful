import {
  User,
  Subject,
  TutorSubject,
} from "../models/user.model.js";

const SAMPLE_TUTORS = [
  {
    firstName: "Emily",
    lastName: "Johnson",
    email: "emily.johnson@example.com",
    password: "password123",
    phone: "91234567",
    hourlyRate: 35.0,
    subjects: [
      { name: "Mathematics", gradeLevel: "Secondary 3", experienceLevel: "advanced" },
      { name: "Science", gradeLevel: "Secondary 1", experienceLevel: "intermediate" },
    ],
  },
  {
    firstName: "Michael",
    lastName: "Smith",
    email: "michael.smith@example.com",
    password: "password123",
    phone: "91234568",
    hourlyRate: 40.0,
    subjects: [
      { name: "English", gradeLevel: "Secondary 3", experienceLevel: "expert" },
      { name: "English", gradeLevel: "Primary 6", experienceLevel: "advanced" },
    ],
  },
  {
    firstName: "Sarah",
    lastName: "Davis",
    email: "sarah.davis@example.com",
    password: "password123",
    phone: "91234569",
    hourlyRate: 30.0,
    subjects: [
      { name: "Physics", gradeLevel: "Secondary 3", experienceLevel: "expert" },
      { name: "Chemistry", gradeLevel: "Secondary 3", experienceLevel: "intermediate" },
    ],
  },
  {
    firstName: "David",
    lastName: "Wilson",
    email: "david.wilson@example.com",
    password: "password123",
    phone: "91234570",
    hourlyRate: 45.0,
    subjects: [
      { name: "Computer Science", gradeLevel: "Junior College 1", experienceLevel: "expert" },
      { name: "Mathematics", gradeLevel: "Secondary 1", experienceLevel: "advanced" },
    ],
  },
  {
    firstName: "Jessica",
    lastName: "Brown",
    email: "jessica.brown@example.com",
    password: "password123",
    phone: "91234571",
    hourlyRate: 25.0,
    subjects: [
      { name: "Biology", gradeLevel: "Secondary 3", experienceLevel: "intermediate" },
      { name: "Science", gradeLevel: "Primary 6", experienceLevel: "advanced" },
    ],
  },
];

export async function seedTutors() {
  try {
    console.log("Seeding tutors...");

    for (const tutorData of SAMPLE_TUTORS) {
      // Check if tutor already exists
      const existingTutor = await User.findOne({
        where: { email: tutorData.email, role: 'tutor' },
      });

      if (!existingTutor) {
        // Create tutor (password will be automatically hashed by model hooks)
        const tutor = await User.create({
          firstName: tutorData.firstName,
          lastName: tutorData.lastName,
          email: tutorData.email,
          password: tutorData.password,
          phone: tutorData.phone,
          hourlyRate: tutorData.hourlyRate,
          isActive: true,
          role: 'tutor',
        });

        // Add subjects
        for (const subjectData of tutorData.subjects) {
          const subject = await Subject.findOne({
            where: { 
              name: subjectData.name,
              gradeLevel: subjectData.gradeLevel
            },
          });
          if (subject) {
            await TutorSubject.create({
              tutorId: tutor.id,
              subjectId: subject.id,
              experienceLevel: subjectData.experienceLevel,
            });
          } else {
            console.log(`⚠️  Subject not found: ${subjectData.name} (${subjectData.gradeLevel})`);
          }
        }

        console.log(`✅ Created tutor: ${tutor.firstName} ${tutor.lastName}`);
      } else {
        console.log(
          `⚪ Tutor already exists: ${tutorData.firstName} ${tutorData.lastName}`
        );
      }
    }

  const tutorCount = await User.count({ where: { isActive: true, role: 'tutor' } });
  console.log(`Tutors seeding complete: ${tutorCount} total active tutors`);
  } catch (error) {
    console.error("Error seeding tutors:", error);
  }
}
