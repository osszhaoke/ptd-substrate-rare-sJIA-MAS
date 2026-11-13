# R38 独立定向审计报告

结论：**功能三项修复通过（适用于本地固定虚构夹具和当前源码绑定）；整体技术债为附条件**。本轮未复现 P0/P1 代码缺陷。R38 的性能门槛出现一次失败、一次新鲜窗口通过，不能把它写成稳定通过；另有 P3 测试覆盖缺口。

## 范围和身份

审计根为 `/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。现场工作树在审计前已有未提交治理、R38 代码/测试以及历史归档清理差异；本轮只新增 `evidence/r38-independent-audit/` 审计输出，没有改源码、数据库、权限、历史证据或现有服务。当前源码/工具指纹为 `f57ee3e80b23131acd049a0e6d0e7cefd52d1e015ed272a8b1db32f35ee3a1b4`，282 个绑定文件；作者 R38 证明的绑定与现场指纹相同，但作者证明不作为本轮独立通过依据。

## 功能结论

### 1. 选图与上传边界：通过

源码路径：[editor.js:49,61,67](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/features/editor.js:49)、[editor_flow.js:16,18](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/app/editor_flow.js:16)、[main.js:63,81](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/app/main.js:63)、[ocr.js:7,12](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/adapters/ocr.js:7)。`start-review`只调用本地步骤切换；只有`ocr`处理器进入`recognize`并POST `/api/ocr`。

独立回环浏览器复验使用 `web/fixture.png`、新 profile、虚构配置和 fake response：点击“下一步：核信息（不上传）”后请求数为0；返回后点击“上传并识别”请求数为1；没有正式保存，结果摘要在[ocr-flow-gate.json](ocr-flow-gate.json)。现有完整OCR表格控制也报告5项候选、51行原文、0付费调用、零结果诚实提示、取消后手工值保留：[ocr-tables-wire/result.json](ocr-tables-wire/result.json)。

### 2. ALT/AST显示身份：通过

[identity.js:23-31](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/domain/metrics/identity.js:23)使用严格全名集合和显式显示标签；[catalog.js:26](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/domain/metrics/catalog.js:26)登记谷丙为`report:alt`，[catalog.js:129](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/domain/metrics/catalog.js:129)登记谷草为`ast`。固定单测[metric_identity.test.mjs:43](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/tests/metric_identity.test.mjs:43)实际断言`ALT（谷丙转氨酶）`和`AST（谷草转氨酶）`，本次npm独立运行167/167通过。

### 3. 前白蛋白 g/L：通过

[identity.js:27-31](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/domain/metrics/identity.js:27)按原单位参与身份匹配；[catalog.js:33](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/domain/metrics/catalog.js:33)为前白蛋白显式允许`mg/L`和`g/L`，不做浓度换算；[metric_identity.test.mjs:47](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/tests/metric_identity.test.mjs:47)实际断言输入`g/L`原样返回`g/L`。未知单位或无法唯一匹配会回落为`REPORT_NAME`，不会猜测。

原始名称、单位、来源行和参考范围仍由[editor.js:17,24,26](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/features/editor.js:17)、[report_rows.js:12,20,31](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/features/report_rows.js:12)保留；用户修改后显示原始来源备注，保存前要求逐项勾选，代码路径没有自动确认或自动保存。

## 技术债与问题分级

### P0/P1：未发现

本片没有复现绕过本人确认、付费自动重试、正式记录自动保存、指标错配或单位换算。`recognize`在[ocr.js:11-13](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/web/adapters/ocr.js:11)只有一次显式POST，`main.js:74-90`把候选→暂存→确认→提交分开；[gateway/ocr.py:103-149](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/gateway/ocr.py:103)的预算预留仍是单进程原子落盘、无自动退款/重试，本轮未触发真实供应商。R38之外的真实设备、临床和真实语料不在本结论内。

### P2-001：10,000条冷读性能窗口不稳定，首次门槛失败（证据缺口/待定位性能风险，不定性为已确认代码缺陷）

触发：指定 `PYTHONPATH=. python3 -B tools/verify_debt.py --output evidence/r38-independent-audit` 的同一完整窗口，在1000→3000→6000→10000顺序、同一新虚构profile下，`state-scale-10000.json`得到冷读 `[901,954,1076,1145,858,847,904]`，P95=1145ms，限值1000ms，结果`STATE_SCALE_TARGET_NOT_MET`。原始SHA256为 `548e106867115774dc1f4374978cdc132a83cc8a3c8612df7118eebf7d42b86c`；完整门槛结果为[verify result](result.json)，`ok=false`，在61项检查后停止。

独立定向新鲜profile从空库直接到10000再跑7次得到冷P95=501ms、热P95=1ms（[复跑摘要](state-scale-10000-recheck.json)）。两窗口都是真实Mac WebKit虚构夹具，差异说明首次超时受历史累计状态、调度或环境窗口影响，尚未唯一定位；不能将一次失败写成稳定产品缺陷，也不能用一次通过关闭风险。

最小后续建议：保留两窗口和环境信息；由Writer/性能负责人在同一解锁前台环境做固定顺序的重复完整窗口，若仍超限，再对`stateSnapshot`/投影的IDB读取、克隆和同步投影分段量测；验收标准为预先绑定的完整窗口冷P95≤1000ms、热P95≤250ms，且不混合环境样本。当前不建议因该项直接改锁或改业务语义。

### P3-001：仓库浏览器夹具未独立断言“核信息按钮零请求”

[tests/browser.ocr-tables.js:18-22](/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/tests/browser.ocr-tables.js:18)在选图后检查按钮文案，随后直接点击OCR；它没有在点击“下一步：核信息（不上传）”后统计 `/api/ocr` 为零。本轮用同一固定虚构fixture在临时脚本补上该断言并通过，但该断言尚未进入仓库测试入口。

最小修复建议：在该现有测试中先包裹`fetch`计数，点击`start-review`并断言请求数为0，再返回选图，执行现有OCR控制；验收标准是该变异若把`start-review`接到`recognize`，测试由实际请求计数失败，而非被前置检查拦截。

## 验证和证据

- `npm test`：本次独立实跑167 tests、167 pass、0 fail；日志SHA256 `27e199c5ad69d2a2391e8a528303945c345cdeaeabedaacd49132ac99817df7a`，见[npm-test.log](npm-test.log)。
- `PYTHONPATH=. python3 -B tools/verify_debt.py --output evidence/r38-independent-audit`：独立执行；probe、Node、Python及前61个白名单检查通过，在`state-scale-10000`失败，未生成全套66通过结论。失败结果SHA256 `937f5579fe6c827edfda25b5eee4e546b6aa41c9e28f4b02a7ff0b6686fd583e`。
- 作者证据[evidence/r38-ocr-fix01/result.json](../r38-ocr-fix01/result.json)实际读取为`ok=true`、66/66 PASS、`paidProviderCalls=0`，SHA256 `feb1a962256828e2acbda838f675079a4e433c4fb683fe2fb63eb560b12257fb`；它支持作者声明的绑定身份，但不替代本次失败的独立完整门槛。
- 当前重点源码SHA256见[AUDIT_SUMMARY.json](AUDIT_SUMMARY.json)；本次源码未被改写。

## 公网GET核对

仅执行GET，未访问`/api/ocr`。健康端点HTTP 200、134字节；静态资源均HTTP 200，状态、字节数、SHA256与本地相同：index 2042，editor_flow 3240，editor 7858，sw 3988，identity 3013。完整对账见[public-get.json](public-get.json)。这只证明当前公网静态字节一致，不证明真实OCR、设备内存、低空间、BFCache、本人或临床验收。

## 未覆盖范围

真实OCR准确率与真实响应正文、LOINC覆盖、iPhone总内存、真实低空间、BFCache、本人验收、临床验收、真实患者资料和付费额度均未覆盖；本轮付费OCR调用为0。`gateway/ocr.py`仅按源码及虚构测试检查，未读取凭据或发真实请求。

最小后续切片：先把P3零请求断言并入`browser.ocr-tables.js`，再按固定完整窗口重复R38性能样本；若稳定超限，单独做量测和修复审计。不要扩大本片为LOINC或真实设备/临床验收。
