import { Subject } from '../src/models/index.js';

export async function seedSubjects() {
  try {
    console.log('Seeding subjects...');

    const subjects = [
      // Primary School Mathematics (P1-P6)
      { name: 'Mathematics', description: 'Basic counting, addition, subtraction', gradeLevel: 'Primary 1' },
      { name: 'Mathematics', description: 'Multiplication, division, simple word problems', gradeLevel: 'Primary 2' },
      { name: 'Mathematics', description: 'Fractions, decimals, measurement', gradeLevel: 'Primary 3' },
      { name: 'Mathematics', description: 'Factors, multiples, geometry basics', gradeLevel: 'Primary 4' },
      { name: 'Mathematics', description: 'Percentages, ratios, averages', gradeLevel: 'Primary 5' },
      { name: 'Mathematics', description: 'Algebra basics, speed, circles', gradeLevel: 'Primary 6' },
      
      // Secondary Mathematics (Sec 1-5)
      { name: 'Mathematics', description: 'Algebra, basic geometry, statistics', gradeLevel: 'Secondary 1' },
      { name: 'Mathematics', description: 'Graphs, linear equations, mensuration', gradeLevel: 'Secondary 2' },
      { name: 'Mathematics', description: 'Quadratic equations, trigonometry, graphs', gradeLevel: 'Secondary 3' },
      { name: 'Mathematics', description: 'Calculus, vectors, complex numbers', gradeLevel: 'Secondary 4' },
      { name: 'Mathematics', description: 'Additional mathematics topics', gradeLevel: 'Secondary 5' },
      
      // JC Mathematics
      { name: 'Mathematics', description: 'H1 Mathematics - Functions, calculus, probability', gradeLevel: 'Junior College 1' },
      { name: 'Mathematics', description: 'H2 Mathematics - Advanced calculus, complex numbers', gradeLevel: 'Junior College 1' },
      { name: 'Mathematics', description: 'H1 Mathematics - Statistics, sequences, series', gradeLevel: 'Junior College 2' },
      { name: 'Mathematics', description: 'H2 Mathematics - Vectors, differential equations', gradeLevel: 'Junior College 2' },

      // Primary English (P1-P6)
      { name: 'English', description: 'Phonics, basic reading, simple sentences', gradeLevel: 'Primary 1' },
      { name: 'English', description: 'Grammar basics, reading comprehension', gradeLevel: 'Primary 2' },
      { name: 'English', description: 'Vocabulary building, composition writing', gradeLevel: 'Primary 3' },
      { name: 'English', description: 'Grammar rules, comprehension skills', gradeLevel: 'Primary 4' },
      { name: 'English', description: 'Synthesis, transformation, composition', gradeLevel: 'Primary 5' },
      { name: 'English', description: 'PSLE preparation, oral communication', gradeLevel: 'Primary 6' },
      
      // Secondary English (Sec 1-5)
      { name: 'English', description: 'Literature, essay writing, grammar', gradeLevel: 'Secondary 1' },
      { name: 'English', description: 'Creative writing, comprehension skills', gradeLevel: 'Secondary 2' },
      { name: 'English', description: 'Advanced literature, critical analysis', gradeLevel: 'Secondary 3' },
      { name: 'English', description: 'O-Level preparation, argumentative essays', gradeLevel: 'Secondary 4' },
      { name: 'English', description: 'A-Level preparation, advanced composition', gradeLevel: 'Secondary 5' },
      
      // JC General Paper
      { name: 'General Paper', description: 'Critical thinking, essay writing, comprehension', gradeLevel: 'Junior College 1' },
      { name: 'General Paper', description: 'Current affairs, argumentation skills', gradeLevel: 'Junior College 2' },

      // Primary Science (P1-P6)
      { name: 'Science', description: 'Living and non-living things, basic concepts', gradeLevel: 'Primary 1' },
      { name: 'Science', description: 'Plants, animals, materials', gradeLevel: 'Primary 2' },
      { name: 'Science', description: 'Diversity, cycles, systems', gradeLevel: 'Primary 3' },
      { name: 'Science', description: 'Matter, energy, interactions', gradeLevel: 'Primary 4' },
      { name: 'Science', description: 'Cycles, systems, energy', gradeLevel: 'Primary 5' },
      { name: 'Science', description: 'PSLE Science preparation', gradeLevel: 'Primary 6' },
      
      // Secondary Science (Sec 1-2)
      { name: 'Science', description: 'Integrated science - biology, chemistry, physics', gradeLevel: 'Secondary 1' },
      { name: 'Science', description: 'Advanced integrated science concepts', gradeLevel: 'Secondary 2' },

      // Physics (Sec 3-JC2)
      { name: 'Physics', description: 'Measurements, kinematics, dynamics', gradeLevel: 'Secondary 3' },
      { name: 'Physics', description: 'O-Level Physics preparation', gradeLevel: 'Secondary 4' },
      { name: 'Physics', description: 'A-Level Physics preparation', gradeLevel: 'Secondary 5' },
      { name: 'Physics', description: 'H1 Physics - Mechanics, thermal physics', gradeLevel: 'Junior College 1' },
      { name: 'Physics', description: 'H2 Physics - Waves, electricity, modern physics', gradeLevel: 'Junior College 1' },
      { name: 'Physics', description: 'H1 Physics - Oscillations, nuclear physics', gradeLevel: 'Junior College 2' },
      { name: 'Physics', description: 'H2 Physics - Electromagnetism, quantum physics', gradeLevel: 'Junior College 2' },

      // Chemistry (Sec 3-JC2)
      { name: 'Chemistry', description: 'Experimental chemistry, atomic structure', gradeLevel: 'Secondary 3' },
      { name: 'Chemistry', description: 'O-Level Chemistry preparation', gradeLevel: 'Secondary 4' },
      { name: 'Chemistry', description: 'A-Level Chemistry preparation', gradeLevel: 'Secondary 5' },
      { name: 'Chemistry', description: 'H1 Chemistry - Mole concept, kinetics', gradeLevel: 'Junior College 1' },
      { name: 'Chemistry', description: 'H2 Chemistry - Atomic structure, energetics', gradeLevel: 'Junior College 1' },
      { name: 'Chemistry', description: 'H1 Chemistry - Organic chemistry, equilibria', gradeLevel: 'Junior College 2' },
      { name: 'Chemistry', description: 'H2 Chemistry - Transition elements, organic synthesis', gradeLevel: 'Junior College 2' },

      // Biology (Sec 3-JC2)
      { name: 'Biology', description: 'Cell biology, movement of substances', gradeLevel: 'Secondary 3' },
      { name: 'Biology', description: 'O-Level Biology preparation', gradeLevel: 'Secondary 4' },
      { name: 'Biology', description: 'A-Level Biology preparation', gradeLevel: 'Secondary 5' },
      { name: 'Biology', description: 'H1 Biology - Cell and molecular biology', gradeLevel: 'Junior College 1' },
      { name: 'Biology', description: 'H2 Biology - Genetics, evolution, ecology', gradeLevel: 'Junior College 1' },
      { name: 'Biology', description: 'H1 Biology - Physiology, inheritance', gradeLevel: 'Junior College 2' },
      { name: 'Biology', description: 'H2 Biology - Regulation, biodiversity', gradeLevel: 'Junior College 2' },

      // Mother Tongue Languages (P1-JC2)
      { name: 'Chinese', description: 'Basic Chinese characters, pinyin', gradeLevel: 'Primary 1' },
      { name: 'Chinese', description: 'Sentence formation, basic composition', gradeLevel: 'Primary 2' },
      { name: 'Chinese', description: 'Reading comprehension, composition', gradeLevel: 'Primary 3' },
      { name: 'Chinese', description: 'Grammar, vocabulary expansion', gradeLevel: 'Primary 4' },
      { name: 'Chinese', description: 'PSLE Chinese preparation', gradeLevel: 'Primary 5' },
      { name: 'Chinese', description: 'Advanced PSLE Chinese', gradeLevel: 'Primary 6' },
      { name: 'Chinese', description: 'Secondary Chinese language skills', gradeLevel: 'Secondary 1' },
      { name: 'Chinese', description: 'Higher Chinese language skills', gradeLevel: 'Secondary 2' },
      { name: 'Chinese', description: 'O-Level Chinese preparation', gradeLevel: 'Secondary 3' },
      { name: 'Chinese', description: 'Higher Chinese O-Level', gradeLevel: 'Secondary 4' },

      { name: 'Malay', description: 'Basic Malay vocabulary, reading', gradeLevel: 'Primary 1' },
      { name: 'Malay', description: 'Sentence structure, composition', gradeLevel: 'Primary 2' },
      { name: 'Malay', description: 'Grammar, comprehension skills', gradeLevel: 'Primary 3' },
      { name: 'Malay', description: 'Vocabulary expansion, writing', gradeLevel: 'Primary 4' },
      { name: 'Malay', description: 'PSLE Malay preparation', gradeLevel: 'Primary 5' },
      { name: 'Malay', description: 'Advanced PSLE Malay', gradeLevel: 'Primary 6' },

      { name: 'Tamil', description: 'Basic Tamil letters, reading', gradeLevel: 'Primary 1' },
      { name: 'Tamil', description: 'Sentence formation, vocabulary', gradeLevel: 'Primary 2' },
      { name: 'Tamil', description: 'Grammar, composition writing', gradeLevel: 'Primary 3' },
      { name: 'Tamil', description: 'Reading comprehension, writing', gradeLevel: 'Primary 4' },
      { name: 'Tamil', description: 'PSLE Tamil preparation', gradeLevel: 'Primary 5' },
      { name: 'Tamil', description: 'Advanced PSLE Tamil', gradeLevel: 'Primary 6' },

      // Social Studies/History/Geography
      { name: 'Social Studies', description: 'Basic social studies concepts', gradeLevel: 'Primary 1' },
      { name: 'Social Studies', description: 'Community and environment', gradeLevel: 'Primary 2' },
      { name: 'Social Studies', description: 'Singapore history basics', gradeLevel: 'Primary 3' },
      { name: 'Social Studies', description: 'Singapore development', gradeLevel: 'Primary 4' },
      { name: 'Social Studies', description: 'ASEAN and global perspectives', gradeLevel: 'Primary 5' },
      { name: 'Social Studies', description: 'PSLE Social Studies', gradeLevel: 'Primary 6' },

      { name: 'History', description: 'Singapore and world history', gradeLevel: 'Secondary 1' },
      { name: 'History', description: 'Southeast Asian history', gradeLevel: 'Secondary 2' },
      { name: 'History', description: 'Modern world history', gradeLevel: 'Secondary 3' },
      { name: 'History', description: 'O-Level History preparation', gradeLevel: 'Secondary 4' },

      { name: 'Geography', description: 'Physical and human geography', gradeLevel: 'Secondary 1' },
      { name: 'Geography', description: 'Environmental geography', gradeLevel: 'Secondary 2' },
      { name: 'Geography', description: 'Regional geography', gradeLevel: 'Secondary 3' },
      { name: 'Geography', description: 'O-Level Geography preparation', gradeLevel: 'Secondary 4' },

      // Computer Science and Technology
      { name: 'Computer Science', description: 'Programming fundamentals, algorithms', gradeLevel: 'Secondary 1' },
      { name: 'Computer Science', description: 'Web development, data structures', gradeLevel: 'Secondary 2' },
      { name: 'Computer Science', description: 'O-Level Computing preparation', gradeLevel: 'Secondary 3' },
      { name: 'Computer Science', description: 'Advanced computing concepts', gradeLevel: 'Secondary 4' },
      { name: 'Computer Science', description: 'A-Level Computing preparation', gradeLevel: 'Secondary 5' },
      { name: 'Computer Science', description: 'H1 Computing - Programming, algorithms', gradeLevel: 'Junior College 1' },
      { name: 'Computer Science', description: 'H2 Computing - Data structures, OOP', gradeLevel: 'Junior College 1' },
      { name: 'Computer Science', description: 'H1 Computing - Databases, networking', gradeLevel: 'Junior College 2' },
      { name: 'Computer Science', description: 'H2 Computing - AI, software engineering', gradeLevel: 'Junior College 2' },

      // Additional Subjects
      { name: 'Art', description: 'Basic drawing, coloring techniques', gradeLevel: 'Primary 1' },
      { name: 'Music', description: 'Basic rhythm, singing, music appreciation', gradeLevel: 'Primary 1' },
      { name: 'Physical Education', description: 'Basic motor skills, games', gradeLevel: 'Primary 1' },
      
      // International System (Sample)
      { name: 'Mathematics', description: 'Grade 1 Mathematics', gradeLevel: 'Grade 1' },
      { name: 'English', description: 'Grade 1 English', gradeLevel: 'Grade 1' },
      { name: 'Science', description: 'Grade 1 Science', gradeLevel: 'Grade 1' }
    ];

    // Use findOrCreate with both name AND gradeLevel
    let createdCount = 0;
    let existingCount = 0;
    let updatedCount = 0;

    for (const subjectData of subjects) {
      const [subject, created] = await Subject.findOrCreate({
        where: { 
          name: subjectData.name,
          gradeLevel: subjectData.gradeLevel 
        },
        defaults: {
          ...subjectData,
          isActive: true
        }
      });
      
      if (created) {
        createdCount++;
        console.log(`✅ Created subject: ${subject.name} (${subject.gradeLevel})`);
      } else {
        existingCount++;
        // Optional: Update existing subject if needed
        if (subject.description !== subjectData.description || subject.isActive === false) {
          await subject.update({
            description: subjectData.description,
            isActive: true
          });
          updatedCount++;
          console.log(`🔄 Updated subject: ${subject.name} (${subject.gradeLevel})`);
        }
      }
    }

    console.log(`Subjects seeding complete: ${createdCount} created, ${existingCount} already existed, ${updatedCount} updated`);
    return { created: createdCount, existing: existingCount, updated: updatedCount };

  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    throw error;
  }
}