# R31-A2R1：验证登记治理修复｜隔离候选

状态：作者验证通过，待用户转交独立复审；未采用。R31-A2的产品结论不变，正式根仍为A1。

## 修复

独立审计指出验证计划元数据漏记两个实际保护点。本候选仅改两份测试文件：`tools/test_plan.json`登记两个产品路径和三个变异；`tests/test_navigation_runner.py`启动时断言声明集合与实际集合严格相等，并将第三个变异纳入结果登记。`web/`、Store、问诊、备份、医学规则、CSS、服务和公网均未改。

## 作者证据

候选绑定 `34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d`；完整61项requiredChecks、134Node、55Python通过。R27旧`old-stage`在本次新窗口已通过，三尺寸导航正向与三个治理变异均通过。候选归档：`evidence/r31-navigation02/R31-A2R1-source-and-evidence.tar.gz`，SHA256 `eec2ab4a48cdb81caa54f32be9ee21cf56e98773e0f0f738901812d04bbc25c2`，205990849字节；清单 `frozen-inventory.json`。

前片A2审计报告 `1614a8a245ddc1139a71d545519ea62a416975a06545ecc247831956f3ca1a0f` 保持原字节。A2仍未采用，A1默认proof/静态绑定不变；本修复没有重启服务、实时OCR、读取真实数据或变更公网。AIh未计量。

独立审计提示词：[AUDIT_R31_A2R1.md](AUDIT_R31_A2R1.md)。用户转交原审计会话后停止，不推进A3。
