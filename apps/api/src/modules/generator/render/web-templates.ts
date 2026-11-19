import type { GenRenderInput } from './naming';
import { pascalCase } from './naming';
import { renderPageScript } from './web-page-script';
import { renderPageTemplate } from './web-page-view';

/** web api 封装产物。 */
export function renderWebApi(def: GenRenderInput): string {
  const pascal = pascalCase(def.name);
  return `import type {
  Create${pascal}Request,
  ${pascal}Item,
  ${pascal}Query,
  PageResult,
  Update${pascal}Request,
} from '@tiangong/contracts';
import { http, type QueryParams } from '@/utils/request';

export function apiList${pascal}(query: ${pascal}Query): Promise<PageResult<${pascal}Item>> {
  return http.get('/${def.name}', { params: query as QueryParams });
}

export function apiGet${pascal}(id: number): Promise<${pascal}Item> {
  return http.get(\`/${def.name}/\${id}\`);
}

export function apiCreate${pascal}(data: Create${pascal}Request): Promise<${pascal}Item> {
  return http.post('/${def.name}', data);
}

export function apiUpdate${pascal}(id: number, data: Update${pascal}Request): Promise<${pascal}Item> {
  return http.put(\`/${def.name}/\${id}\`, data);
}

export function apiDelete${pascal}(id: number): Promise<void> {
  return http.delete(\`/${def.name}/\${id}\`);
}
`;
}

/** web 五段式页面产物。字段标签走 locale 驱动的本地映射（生成器不注入 locales 源文件），公共键走全局 t()。 */
export function renderWebPage(def: GenRenderInput): string {
  return renderPageScript(def) + renderPageTemplate(def);
}
