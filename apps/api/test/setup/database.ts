import { rmSync } from 'node:fs';
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import {
  AUDIT_ROLE_KEY,
  CONTRACT_PROBE,
  EXECUTABLE_DEF,
  NOPERM,
  NOPERM_CREDENTIALS,
  SAMPLE_SEED,
  SAMPLE_UX_SEED,
} from './fixtures';
import { STORAGE_DIR } from './env';

export type Db = PrismaClient;

export type RunScript = (args: string[], label: string) => void;

/** 迁移 + 种子：与 CI 一致的前置条件，重复执行幂等。 */
export function seedDatabase(runScript: RunScript): void {
  runScript(['exec', 'prisma', 'migrate', 'deploy'], 'prisma migrate deploy');
  runScript(['exec', 'prisma', 'db', 'seed'], 'prisma db seed');
}

/** 零权限角色与用户：走真实口令哈希，登录路径与正式用户一致。 */
export async function createNopermFixture(prisma: Db): Promise<void> {
  const role = await prisma.role.create({
    data: { name: NOPERM.nickname, roleKey: NOPERM.roleKey },
  });
  const user = await prisma.user.create({
    data: {
      username: NOPERM_CREDENTIALS.username,
      nickname: NOPERM.nickname,
      passwordHash: await hash(NOPERM_CREDENTIALS.password),
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
}

async function removeNopermFixture(prisma: Db): Promise<void> {
  const user = await prisma.user.findUnique({ where: { username: NOPERM_CREDENTIALS.username } });
  if (!user) {
    return;
  }
  const userId = { userId: user.id };
  await prisma.refreshToken.deleteMany({ where: userId });
  await prisma.operLog.deleteMany({ where: userId });
  await prisma.userRole.deleteMany({ where: userId });
  await prisma.user.delete({ where: { id: user.id } });
}

/** 按外键顺序删除本套件创建的确定性实体（保证整套件可重复运行）。 */
export async function cleanupFixtures(prisma: Db): Promise<void> {
  await removeNopermFixture(prisma);
  await prisma.role.deleteMany({
    where: { roleKey: { in: [NOPERM.roleKey, AUDIT_ROLE_KEY, CONTRACT_PROBE.roleKey] } },
  });
  await prisma.fileObject.deleteMany({});
  await prisma.sampleRecord.deleteMany({
    where: {
      OR: [{ name: { startsWith: SAMPLE_SEED } }, { name: { startsWith: SAMPLE_UX_SEED } }],
    },
  });
  await prisma.genDefinition.deleteMany({
    where: { name: { in: [EXECUTABLE_DEF.name, CONTRACT_PROBE.genName] } },
  });
  await prisma.dictItem.deleteMany({ where: { dictKey: CONTRACT_PROBE.dictKey } });
  await prisma.dictType.deleteMany({ where: { dictKey: CONTRACT_PROBE.dictKey } });
  await prisma.setting.deleteMany({ where: { settingKey: CONTRACT_PROBE.settingKey } });
  rmSync(STORAGE_DIR, { recursive: true, force: true });
  // admin 的失败计数跨轮次累计会触发锁定，每次运行前复位
  await prisma.user.update({
    where: { username: 'admin' },
    data: { failedAttempts: 0, lockUntil: null },
  });
}
