# 工程文档导航

当前磁盘采用版本为 **R34**。本页整理文档入口，不改变历史报告、验证结论或运行服务。实际当前状态先读根目录 [STATUS.json](../STATUS.json)、[ACCEPTANCE.json](../ACCEPTANCE.json)、[AUTHORIZATION.json](../AUTHORIZATION.json)、[DECISIONS.md](../DECISIONS.md)。历史文档中的“当前”“下一步”和服务信息只代表其发生时点。

## 当前产品及复核

源码/测试/工具等282项，绑定 `5ec9f2b0a1c84f4b1993f30af70dec212a5462827adaa3602c2e20b5687f5d21`。默认作者证明为66检查/166 Node/55 Python；源码采用、作者验证、独立复核、当前进程实际加载、本人及临床验收分别判断。

- [默认R34证明](../evidence/r34-alias02/candidate/evidence/full03/result.json)
- [R34采用回执](../evidence/r34-adoption01/adoption-closure.json)
- [R34治理修复回执](../evidence/r34-governance-repair01/receipt.json)
- [最近一次独立治理复核](/Users/osszhaoke/Downloads/PTDS-Flash-R34-governance-independent-20261112-220906/REPORT.md)：P2/P3关闭，整体附条件结论保留。
- [OCR_STATE_R34](OCR_STATE_R34.md)
- [AUDIT_R34](AUDIT_R34.md)
- [PHONE_ACCEPTANCE](PHONE_ACCEPTANCE.md)

性能稳定性、iPhone总内存、真实低空间、BFCache、本人/临床及真实语料边界尚未验收。文档整理不关闭这些缺口。

## 架构与使用

- [ARCHITECTURE](ARCHITECTURE.md)
- [STRUCTURE_R18](STRUCTURE_R18.md)
- [DEBT_RESCAN](DEBT_RESCAN.md)
- [DEPLOYMENT](DEPLOYMENT.md)
- [INVITE_TEST](INVITE_TEST.md)

## 归档与恢复

- [本轮清理报告](../evidence/docs-cleanup-20261112-224615/REPORT.md)
- [逐文件归档清单](../evidence/docs-cleanup-20261112-224615/PLAN.json)
- [归档校验记录](../evidence/docs-cleanup-20261112-224615/ARCHIVE_VERIFIED.json)
- [恢复工具](../evidence/docs-cleanup-20261112-224615/restore.py)

本轮仅归档历史虚构布局/规模测试输出与静态测试站点副本；旧路径可能不再展开存在，内容、权限及修改时间保存在归档中。各轮result.json、Node/Python主日志、当前R34及R31默认完整证明目录、采用/回退材料与既有封存包仍原位保留。不要把归档直接解压覆盖正式工程。

在工程根仅验证归档：

```sh
python3 -B evidence/docs-cleanup-20261112-224615/restore.py
```

还原到工程外、尚不存在的新目录：

```sh
python3 -B evidence/docs-cleanup-20261112-224615/restore.py --destination /tmp/ptds-historical-artifacts-restored
```

可加 `--only-path evidence/具体已归档路径` 仅恢复指定文件；完整原路径列表见PLAN。默认不启动服务、不恢复确认权限、不导入数据库。恢复工具已在独立临时目录全量恢复3104项并核Hash/权限，测试副本已删除。

历次清理回执：

- [CLEANUP_R01](CLEANUP_R01.md)
- [CLEANUP_R26](CLEANUP_R26.md)
- [CONSOLIDATION_R01](CONSOLIDATION_R01.md)

## 历史批次与专题

以下保留原文件名及内容，供追溯，不代替当前状态。按文件名排序，可在页面内搜索批次号。

- [ALPHA_01_ACCESS](ALPHA_01_ACCESS.md)
- [AUDIT_DEBT_R21](AUDIT_DEBT_R21.md)
- [AUDIT_FOLLOWUP_R19](AUDIT_FOLLOWUP_R19.md)
- [AUDIT_FUNCTION_R21](AUDIT_FUNCTION_R21.md)
- [AUDIT_PROMPT_R27](AUDIT_PROMPT_R27.md)
- [AUDIT_R24](AUDIT_R24.md)
- [AUDIT_R31_A1](AUDIT_R31_A1.md)
- [AUDIT_R31_A2](AUDIT_R31_A2.md)
- [AUDIT_R31_A2R1](AUDIT_R31_A2R1.md)
- [AUDIT_R31_A2R2](AUDIT_R31_A2R2.md)
- [AUDIT_R32_T1](AUDIT_R32_T1.md)
- [AUDIT_R33](AUDIT_R33.md)
- [AUDIT_REVIEW_R28](AUDIT_REVIEW_R28.md)
- [AUDIT_REVIEW_R29](AUDIT_REVIEW_R29.md)
- [AUDIT_REVIEW_R30](AUDIT_REVIEW_R30.md)
- [COPY_AUDIT](COPY_AUDIT.md)
- [DEBT_AUDIT_R19](DEBT_AUDIT_R19.md)
- [DEBT_R05](DEBT_R05.md)
- [DECISION_BOOK_ENGINEERING_REVIEW](DECISION_BOOK_ENGINEERING_REVIEW.md)
- [DELIVERY](DELIVERY.md)
- [DELIVERY_R26](DELIVERY_R26.md)
- [DELIVERY_R27](DELIVERY_R27.md)
- [DELIVERY_R31_A1](DELIVERY_R31_A1.md)
- [DELIVERY_R31_A2](DELIVERY_R31_A2.md)
- [DELIVERY_R31_A2R1](DELIVERY_R31_A2R1.md)
- [DEMO_TEST_REVIEW_R26](DEMO_TEST_REVIEW_R26.md)
- [DEMO_USER_TEST_V1_1_R26](DEMO_USER_TEST_V1_1_R26.md)
- [HOME_RESOURCES_R17](HOME_RESOURCES_R17.md)
- [IMAGE_COVERAGE_R26](IMAGE_COVERAGE_R26.md)
- [LOCAL_OCR_R23](LOCAL_OCR_R23.md)
- [OCR_COVERAGE_DIAGNOSIS_R24](OCR_COVERAGE_DIAGNOSIS_R24.md)
- [OCR_COVERAGE_R27](OCR_COVERAGE_R27.md)
- [OCR_REVIEW_R21](OCR_REVIEW_R21.md)
- [OCR_STATE_R33](OCR_STATE_R33.md)
- [OCR_TABLE_REPAIR_R20](OCR_TABLE_REPAIR_R20.md)
- [PARTNER_ACCEPTANCE_R30](PARTNER_ACCEPTANCE_R30.md)
- [PARTNER_ACCEPTANCE_R30_RESTART02](PARTNER_ACCEPTANCE_R30_RESTART02.md)
- [REPAIR_R13](REPAIR_R13.md)
- [REPAIR_R14](REPAIR_R14.md)
- [REPAIR_R15](REPAIR_R15.md)
- [REPAIR_R16](REPAIR_R16.md)
- [REPAIR_R28](REPAIR_R28.md)
- [REPAIR_R29](REPAIR_R29.md)
- [REPAIR_R30](REPAIR_R30.md)
- [REPORT_ROWS_FOLLOWUP_R25](REPORT_ROWS_FOLLOWUP_R25.md)
- [REPORT_ROWS_R24](REPORT_ROWS_R24.md)
- [REVIEW_CLOSEOUT_R25](REVIEW_CLOSEOUT_R25.md)
- [REVIEW_CLOSEOUT_R30](REVIEW_CLOSEOUT_R30.md)
- [REVIEW_CLOSEOUT_R31_A1](REVIEW_CLOSEOUT_R31_A1.md)
- [REVIEW_CLOSEOUT_R31_A2_ADOPTED](REVIEW_CLOSEOUT_R31_A2_ADOPTED.md)
- [REVIEW_STARTUP_R23](REVIEW_STARTUP_R23.md)
- [STAGE_R12](STAGE_R12.md)
- [STARTUP_FALLBACK_R23](STARTUP_FALLBACK_R23.md)
- [STATE_TREND_R32](STATE_TREND_R32.md)
- [STATE_UI_DIAGNOSIS_R31](STATE_UI_DIAGNOSIS_R31.md)
- [USER_FEEDBACK_PLAN_R31](USER_FEEDBACK_PLAN_R31.md)
- [VIDEO_OCR_REVIEW_R19](VIDEO_OCR_REVIEW_R19.md)
