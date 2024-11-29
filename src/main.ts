import { createRecipe, logRecipes } from './utils';
import { initDb } from './db';

(async () => {
  const db = await initDb();

  await createRecipe(db, 'Stamppot Boerenkool for 4 persons');
  await logRecipes(db);
})();
