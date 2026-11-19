import type { GenRenderInput } from './naming';
import { renderController, renderModule } from './api-controller-template';
import { renderService } from './api-service-template';

/** NestJS service / controller / module 三件产物。 */
export function renderApiFiles(def: GenRenderInput): Array<{ path: string; content: string }> {
  return [
    {
      path: `apps/api/src/modules/${def.name}/${def.name}.service.ts`,
      content: renderService(def),
    },
    {
      path: `apps/api/src/modules/${def.name}/${def.name}.controller.ts`,
      content: renderController(def),
    },
    {
      path: `apps/api/src/modules/${def.name}/${def.name}.module.ts`,
      content: renderModule(def),
    },
  ];
}
