import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { DICTS, MENUS, PERMISSIONS, SETTINGS, type MenuSeed } from './seed-data';
import { defined } from '../src/common/defined';

const prisma = new PrismaClient();

async function seedPermissions(): Promise<void> {
  for (const [resource, action, name] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: { name },
      create: { resource, action, name },
    });
  }
  console.log(`[seed] permissions: ${PERMISSIONS.length} upserted`);
}

/** 菜单无唯一键，按 parent+name 定位既有行（幂等 seed）。 */
async function findMenuId(name: string, parentId: number): Promise<number> {
  const existing = await prisma.menu.findFirst({ where: { name, parentId } });
  return existing?.id ?? -1;
}

async function upsertMenu(m: MenuSeed, parentId: number): Promise<number> {
  const row = await prisma.menu.upsert({
    where: { id: await findMenuId(m.name, parentId) },
    update: {},
    create: defined({
      parentId,
      name: m.name,
      menuType: m.menuType,
      path: m.path,
      component: m.component,
      perms: m.perms,
      icon: m.icon,
      sort: m.sort,
    }),
  });
  return row.id;
}

async function seedRootMenus(menuIds: Map<string, number>): Promise<void> {
  for (const m of MENUS) {
    if (m.parent) {
      continue;
    }
    menuIds.set(m.key, await upsertMenu(m, 0));
  }
}

async function seedChildMenus(menuIds: Map<string, number>): Promise<void> {
  for (const m of MENUS) {
    if (!m.parent) {
      continue;
    }
    const parentId = menuIds.get(m.parent) ?? 0;
    menuIds.set(m.key, await upsertMenu(m, parentId));
  }
}

/** 菜单树两轮：目录先建，子菜单按 parent key 关联。 */
async function seedMenus(): Promise<void> {
  const menuIds = new Map<string, number>();
  await seedRootMenus(menuIds);
  await seedChildMenus(menuIds);
  console.log(`[seed] menus: ${MENUS.length} upserted`);
}

async function seedDicts(): Promise<void> {
  for (const dict of DICTS) {
    await prisma.dictType.upsert({
      where: { dictKey: dict.dictKey },
      update: { name: dict.name },
      create: { name: dict.name, dictKey: dict.dictKey },
    });
    await seedDictItems(dict);
  }
  console.log(`[seed] dicts: ${DICTS.length} types upserted`);
}

async function seedDictItems(dict: (typeof DICTS)[number]): Promise<void> {
  for (const item of dict.items) {
    await prisma.dictItem.upsert({
      where: { dictKey_value: { dictKey: dict.dictKey, value: item.value } },
      update: defined({
        label: item.label,
        tagType: item.tagType,
        sort: item.sort,
        isDefault: item.isDefault ?? false,
      }),
      create: defined({
        dictKey: dict.dictKey,
        label: item.label,
        value: item.value,
        tagType: item.tagType,
        sort: item.sort,
        isDefault: item.isDefault ?? false,
      }),
    });
  }
}

async function seedSettings(): Promise<void> {
  for (const s of SETTINGS) {
    await prisma.setting.upsert({
      where: { settingKey: s.settingKey },
      update: {},
      create: {
        name: s.name,
        settingKey: s.settingKey,
        value: s.value,
        builtin: true,
        remark: s.remark,
      },
    });
  }
  console.log(`[seed] settings: ${SETTINGS.length} upserted`);
}

async function seedAdmin(): Promise<void> {
  const superRole = await prisma.role.upsert({
    where: { roleKey: 'superadmin' },
    update: {},
    create: {
      name: '超级管理员',
      roleKey: 'superadmin',
      sort: 0,
      builtin: true,
      remark: '持有 *:*:* 通配权限',
    },
  });

  const envPassword = process.env['ADMIN_INITIAL_PASSWORD'];
  const password =
    envPassword && envPassword.length >= 8 ? envPassword : randomBytes(12).toString('hex');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nickname: 'Administrator',
      passwordHash: await hash(password),
      remark: '初始管理员（seed 创建）',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superRole.id },
  });
  console.log('[seed] admin user ready');
  if (!envPassword || envPassword.length < 8) {
    console.warn(`[seed] ADMIN_INITIAL_PASSWORD not set; generated once: admin / ${password}`);
  }
}

async function main(): Promise<void> {
  await seedPermissions();
  await seedMenus();
  await seedDicts();
  await seedSettings();
  await seedAdmin();
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
