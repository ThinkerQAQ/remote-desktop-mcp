// Compatibility adapter for Desktop Commander 0.3.1 after its Zod 4 migration.
import { z } from 'zod';
import { WritePdfArgsSchema, PdfOperationSchema } from '../node_modules/@wonderwhy-er/desktop-commander/dist/tools/schemas.js';
export function zodToJsonSchema(schema) {
  const options = { target: 'draft-7', io: 'input', unrepresentable: 'any' };
  const json = z.toJSONSchema(schema, options);
  // Preprocess accepts either Markdown or PDF operations; publish both accepted inputs.
  if (schema === WritePdfArgsSchema) json.properties.content = z.toJSONSchema(z.union([z.string(), z.array(PdfOperationSchema)]), options);
  return json;
}
