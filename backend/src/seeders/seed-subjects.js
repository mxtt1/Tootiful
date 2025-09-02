import { Subject } from '../modules/user-management/user.model.js';

export async function seedSubjects() {
  try {
    console.log('Seeding subjects...');

    // Define subjects to seed
    const subjects = [
      { name: 'Mathematics', description: 'Algebra, Geometry, Calculus, Statistics' },
      { name: 'English', description: 'Literature, Grammar, Writing, Reading Comprehension' },
      { name: 'Science', description: 'Biology, Chemistry, Physics' },
      { name: 'History', description: 'World History, American History, European History' },
      { name: 'Computer Science', description: 'Programming, Data Structures, Algorithms' },
      { name: 'Spanish', description: 'Spanish Language and Literature' },
      { name: 'French', description: 'French Language and Literature' },
      { name: 'Art', description: 'Drawing, Painting, Art History' },
      { name: 'Music', description: 'Piano, Guitar, Music Theory' },
      { name: 'Business', description: 'Economics, Accounting, Marketing' }
    ];

    // Use findOrCreate to only create subjects that don't exist
    let createdCount = 0;
    let existingCount = 0;

    for (const subjectData of subjects) {
      const [subject, created] = await Subject.findOrCreate({
        where: { name: subjectData.name },
        defaults: subjectData
      });
      
      if (created) {
        createdCount++;
        console.log(`✅ Created subject: ${subject.name}`);
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

