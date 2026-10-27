import { z, type ZodType } from 'zod';
import { ApiError } from '@flossophy/shared';
import type { AnyRoute } from './route.ts';

const schema = (s: ZodType, io: 'input' | 'output') =>
  z.toJSONSchema(s, { io, unrepresentable: 'any', target: 'openapi-3.0' });

/** OpenAPI 3 document built from the same zod schemas that validate requests. */
export function openApiDoc(routes: AnyRoute[], prefix: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const path = prefix + r.path.replace(/:(\w+)/g, '{$1}');
    const parameters: unknown[] = [];
    for (const [where, s] of [
      ['path', r.params],
      ['query', r.query],
    ] as const) {
      if (!s) continue;
      const js = schema(s, 'input') as { properties?: Record<string, unknown>; required?: string[] };
      for (const [name, prop] of Object.entries(js.properties ?? {})) {
        parameters.push({ name, in: where, required: where === 'path' || !!js.required?.includes(name), schema: prop });
      }
    }
    const errors = { description: 'Error', content: { 'application/json': { schema: schema(ApiError, 'output') } } };
    paths[path] ??= {};
    paths[path][r.method] = {
      tags: [r.tag],
      summary: r.summary,
      security: r.auth ? [{ session: [] }] : [],
      parameters,
      ...(r.body && {
        requestBody: { required: true, content: { 'application/json': { schema: schema(r.body, 'input') } } },
      }),
      responses: {
        [r.status ?? (r.response ? 200 : 204)]: r.response
          ? { description: 'OK', content: { 'application/json': { schema: schema(r.response, 'output') } } }
          : { description: 'Done' },
        '4XX': errors,
      },
    };
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'Flossophy API',
      version: '1.0.0',
      description: 'Find a dentist, see open Slots and book them. Sessions are httpOnly cookies.',
    },
    components: { securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'fl_session' } } },
    paths,
  };
}
