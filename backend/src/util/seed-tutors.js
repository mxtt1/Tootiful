import bcrypt from "bcrypt";
import {
  Tutor,
  Subject,
  TutorSubject,
} from "../modules/user-management/user.model.js";

const SAMPLE_TUTORS = [
  {
    firstName: "Emily",
    lastName: "Johnson",
    email: "emily.johnson@example.com",
    password: "password123",
    phone: "91234567",
    subjects: [
      { name: "Mathematics", experienceLevel: "advanced" },
      { name: "Science", experienceLevel: "intermediate" },
    ],
  },
  {
    firstName: "Michael",
    lastName: "Smith",
    email: "michael.smith@example.com",
    password: "password123",
    phone: "91234568",
    subjects: [
      { name: "English", experienceLevel: "expert" },
      { name: "History", experienceLevel: "advanced" },
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
      { name: "Spanish", experienceLevel: "expert" },
      { name: "French", experienceLevel: "intermediate" },
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
      { name: "Computer Science", experienceLevel: "expert" },
      { name: "Mathematics", experienceLevel: "advanced" },
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
      { name: "Art", experienceLevel: "intermediate" },
      { name: "Music", experienceLevel: "advanced" },
    ],
  },
];

export async function seedTutors() {
  try {
    console.log("Seeding tutors...");

    for (const tutorData of SAMPLE_TUTORS) {
      // Check if tutor already exists
      const existingTutor = await Tutor.findOne({
        where: { email: tutorData.email },
      });

      if (!existingTutor) {
        // Hash password
        const hashedPassword = await bcrypt.hash(tutorData.password, 10);

        // Create tutor
        const tutor = await Tutor.create({
          firstName: tutorData.firstName,
          lastName: tutorData.lastName,
          email: tutorData.email,
          password: hashedPassword,
          phone: tutorData.phone,
          hourlyRate: tutorData.hourlyRate,
          isActive: true,
        });

        // Add subjects
        for (const subjectData of tutorData.subjects) {
          const subject = await Subject.findOne({
            where: { name: subjectData.name },
          });
          if (subject) {
            await TutorSubject.create({
              tutorId: tutor.id,
              subjectId: subject.id,
              experienceLevel: subjectData.experienceLevel,
            });
          }
        }

        console.log(`✅ Created tutor: ${tutor.firstName} ${tutor.lastName}`);
      } else {
        console.log(
          `⚪ Tutor already exists: ${tutorData.firstName} ${tutorData.lastName}`
        );
      }
    }

    const tutorCount = await Tutor.count({ where: { isActive: true } });
    console.log(`Tutors seeding complete: ${tutorCount} total active tutors`);
  } catch (error) {
    console.error("Error seeding tutors:", error);
  }
}
