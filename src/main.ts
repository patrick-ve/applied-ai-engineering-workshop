import { queryDatabase } from './utils';
import { initDb } from './db';

(async () => {
  const db = await initDb();
  await queryDatabase(
    db,
    'Recipes with a cooking time under 45 minutes and fewer than 7 ingredients. Also list the ingredients for each recipe.'
  );
})();
