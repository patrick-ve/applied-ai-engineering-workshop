import { queryDatabase } from './utils';
import { initDb } from './db';

(async () => {
  const db = await initDb();
  await queryDatabase(
    db,
    `
      I am in need of a recipe that is done in less than 35 minutes. 
      Also I only want to use fewer than 8 ingredients.
      
      Show me the recipe ingredients, name, description and cooking time.
    `
  );
})();
