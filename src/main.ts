import { queryRecipes } from './utils';
import { initDb } from './db';

(async () => {
  const db = await initDb();

  await queryRecipes(db, 'Few ingredients');
})();
