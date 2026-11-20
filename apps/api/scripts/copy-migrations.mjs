// Copie les migrations SQL dans dist/ : tsc ne copie que les fichiers TypeScript.
import { cp } from 'node:fs/promises';

await cp('src/db/migrations', 'dist/db/migrations', { recursive: true });
