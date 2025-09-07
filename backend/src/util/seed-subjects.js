import { Subject } from '../modules/user-management/user.model.js';

export async function seedSubjects() {
  try {
    console.log('Seeding subjects...');

    // Define subjects to seed with gradeLevel - now we can have same name for different grades
    const subjects = [
      { 
        name: 'Mathematics', 
        description: 'Basic arithmetic, fractions, simple algebra',
        gradeLevel: 'Primary 6'
      },
      { 
        name: 'Mathematics', 
        description: 'Algebra, basic geometry, statistics',
        gradeLevel: 'Secondary 1'
      },
      { 
        name: 'Mathematics', 
        description: 'Advanced algebra, trigonometry, calculus basics',
        gradeLevel: 'Secondary 3'
      },
      { 
        name: 'English', 
        description: 'Basic grammar, reading comprehension, creative writing',
        gradeLevel: 'Primary 6'
      },
      { 
        name: 'English', 
        description: 'Literature, essay writing, grammar',
        gradeLevel: 'Secondary 1'
      },
      { 
        name: 'English', 
        description: 'Advanced literature, critical analysis, composition',
        gradeLevel: 'Secondary 3'
      },
      { 
        name: 'Science', 
        description: 'Basic biology, chemistry, physics concepts',
        gradeLevel: 'Primary 6'
      },
      { 
        name: 'Science', 
        description: 'Integrated science - biology, chemistry, physics',
        gradeLevel: 'Secondary 1'
      },
      { 
        name: 'Physics', 
        description: 'Mechanics, thermodynamics, electromagnetism',
        gradeLevel: 'Secondary 3'
      },
      { 
        name: 'Chemistry', 
        description: 'Organic, inorganic, physical chemistry',
        gradeLevel: 'Secondary 3'
      },
      { 
        name: 'Biology', 
        description: 'Cell biology, genetics, ecology',
        gradeLevel: 'Secondary 3'
      },
      { 
        name: 'Computer Science', 
        description: 'Programming fundamentals, algorithms',
        gradeLevel: 'Junior College 1'
      }
    ];

    // Use findOrCreate with both name AND gradeLevel
    let createdCount = 0;
    let existingCount = 0;

    for (const subjectData of subjects) {
      const [subject, created] = await Subject.findOrCreate({
        where: { 
          name: subjectData.name,
          gradeLevel: subjectData.gradeLevel 
        },
        defaults: subjectData
      });
      
      if (created) {
        createdCount++;
        console.log(`✅ Created subject: ${subject.name} (${subject.gradeLevel})`);
      } else {
        existingCount++;
      }
    }

    console.log(`Subjects seeding complete: ${createdCount} created, ${existingCount} already existed`);
    return { created: createdCount, existing: existingCount };

  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    throw error;
  }
}

