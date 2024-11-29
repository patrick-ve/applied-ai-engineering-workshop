import fs from 'fs';
import path from 'path';
import { initDb, initSchema } from '.';

const seedDb = async () => {
  const db = await initDb();
  await initSchema(db);

  try {
    const recipesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'recipes.json'), 'utf8')
    );

    for (const recipe of recipesData) {
      await db.query(
        `
          INSERT INTO recipes (
            name, 
            description, 
            servings, 
            equipment, 
            ingredients, 
            steps, 
            totalTime,
            embedding
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
        [
          recipe.name,
          recipe.description,
          recipe.servings,
          recipe.equipment,
          recipe.ingredients,
          recipe.steps,
          recipe.totalTime,
          recipe.embedding,
        ]
      );
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

seedDb();
