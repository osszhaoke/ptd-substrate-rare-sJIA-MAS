# 转交原审计会话：R31-A2R1 验证登记治理修复独立复审

指定会话 `01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6`，仍由用户转交。请只审计准确封存候选，区分功能、技术债与总判定；不采用、不联系其他Agent、不改产品和服务。启动/交接/汇报前实际读取只读规范：`/Users/osszhaoke/Downloads/000-PTDSv0.3-StarTorchv2 - astra/docs/reference/AI_REPORTING_R02.source.txt`。

## 目标与前片

R31-A2独审报告 SHA256 `1614a8a245ddc1139a71d545519ea62a416975a06545ecc247831956f3ca1a0f` 的两项P2：`tools/test_plan.json`漏登记`web/features/settings.js`及`old-download-guide`变异；完整61项独立门槛在旧R27 `old-stage` 模块加载失败处中止。A2仍未采用，正式根仍为A1（267输入、`eb4367b928962e422f409df5d7e5f8d7df9aa7e585070dd0cb7ffc0425e27980`）。本修复候选不改变产品代码、静态页面或问诊组件，只修测试治理。

## 精确封存物

根：`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。封存包：`evidence/r31-navigation02/R31-A2R1-source-and-evidence.tar.gz`；SHA256 `eec2ab4a48cdb81caa54f32be9ee21cf56e98773e0f0f738901812d04bbc25c2`，205990849字节，9235个文件；候选输入绑定 `34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d`。候选proof：`candidate/evidence/r31-navigation-governance-verification01/result.json`。清单：`frozen-inventory.json`；源码差量：`candidate.diff`。候选相对已审A2只应改：`tools/test_plan.json`、`tests/test_navigation_runner.py`；产品差量必须为0。不要解包到产品根，不读凭据、真实库、浏览器真实资料或旧审计展开目录。

## 必须核对

1. 计划`r31Navigation.productPaths`严格为`web/index.html`、`web/features/settings.js`；`mutations`严格为`unhide`、`old-footer`、`old-download-guide`。
2. runner启动时严格断言声明集合与实际集合相等；删掉任一产品路径或变异应明确失败，不能只依赖人工阅读。
3. 在新PID、新profile、新端口实际运行定向runner：三尺寸未变异正向通过，三个变异分别返回`NAVIGATION_VISIBLE_ROUTES`、`NAVIGATION_COPY_STILL_PROMISES_CONSULTATION`、`NAVIGATION_HIDDEN_DOWNLOAD_PROMISE`。
4. 从候选cwd运行完整`tools.verify_debt`；同一绑定下61个requiredChecks必须全部PASS，且R27 footer old-stage、unit、valid各有新PID/成功结果。保留所有日志和失败输出，不拼接旧A2窗口。
5. 检查A2产品文件`web/index.html`、`web/features/settings.js`与A2封存候选逐字节一致；A1正式根、A1独审报告/包、A2独审报告不变。确认没有服务重启、实时OCR、真实数据或公网操作。

## 可执行入口（解包后的candidate cwd）

```sh
python3 -B -m tests.test_navigation_runner --output evidence/independent-a2r1-navigation
python3 -B -m tools.verify_debt --output evidence/independent-a2r1-full
```

不要把作者 `61`项/134Node/55Python proof直接改写成独立结论；独立实际运行后报告PID、窗口、变异和未覆盖范围。若环境再次无法加载旧R27夹具，保留失败并维持附条件，不放宽断言。

## 停止与结论

输出功能、技术债、总判定；说明A2仍未采用。只有用户收到独立回执后，Writer才可决定是否采用A2；本复修候选自身也不得自动采用。真实漏下限、性能、iPhone/低空间、BFCache、本人及临床验收仍保留。原审计展开副本可在证据核对后清理，但封存包和报告不得修改。
