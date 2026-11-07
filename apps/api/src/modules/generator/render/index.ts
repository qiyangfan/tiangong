import type { GenPreviewFile } from '@tiangong/contracts';
import type { GenRenderInput } from './naming';
import { renderApiFiles } from './api-templates';
import { renderContracts, renderPrisma } from './templates';
import { renderWebApi, renderWebPage } from './web-templates';

/** 产物相对仓库根的定版路径（预览与 CLI 落盘共用，保证所见即所得）。 */
export function renderGenFiles(def: GenRenderInput): GenPreviewFile[] {
  return [
    { path: `packages/contracts/src/${def.name}.ts`, content: renderContracts(def) },
    { path: `apps/api/prisma/gen/${def.name}.model.prisma`, content: renderPrisma(def) },
    ...renderApiFiles(def),
    { path: `apps/web/src/api/${def.name}.ts`, content: renderWebApi(def) },
    { path: `apps/web/src/views/${def.name}/index.vue`, content: renderWebPage(def) },
  ];
}

export type { GenRenderInput };
