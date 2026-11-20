# Tasks

## 1. 安全与供应链

- [x] 1.1 CodeQL（js-ts、周排程、SHA 钉死）
- [x] 1.2 osv-scanner 作业
- [ ] 1.3 推送后 CI 实跑（外部账单/授权）

## 2. 文档与小程序

- [x] 2.1 文档链接/锚点检查接入（74 文件 0 broken）
- [x] 2.2 miniapp 继承严格 tsconfig，vue-tsc 通过
- [x] 2.3 knip 排除 miniapp（uni 配置加载失败；已在 knip.json 登记）
- [x] 2.4 e2e 覆盖率阈值启用并实跑（14 用例；84.33/60.58/77.5/84.3 ≥ 84/60/77/84）

## 3. 验证

- [x] 3.1 lint/typecheck/test/format/arch/md/dup/knip/size 全绿
- [x] 3.2 compose 配置由 images 作业 build/up 覆盖
