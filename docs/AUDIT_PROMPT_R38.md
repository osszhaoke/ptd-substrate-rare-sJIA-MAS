# R38 外部独立审计提示词

请对 `/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5` 当前工作树执行一次**只读、独立、可复现**的定向审计。不要修改源码、数据库、权限规则、运行服务或历史证据；不要读取、记录、回显任何腾讯云密钥、试用码、OCR 响应正文或患者资料；不要发起真实 OCR 付费调用。若需要浏览器测试，只使用仓库固定虚构夹具、隔离临时目录和临时浏览器 profile。

## 审计对象

本片修复了三个用户反馈点：

1. 选图后“下一步：核信息（不上传）”只打开本机核对页；只有“上传并识别”触发 `/api/ocr`。
2. 谷丙转氨酶显示 `ALT（谷丙转氨酶）`，谷草转氨酶显示 `AST（谷草转氨酶）`，不得把中文名与英文缩写错配。
3. 前白蛋白在 `g/L` 报告单位下保持 `g/L`，不得凭空补写单位、参考区间或做未经批准的换算。

LOINC 只是后续指标词典增强方向，本片没有引入 LOINC，也不得把未实现的 LOINC 覆盖写成通过项。

## 必查源码

- `web/features/editor.js`
- `web/app/editor_flow.js`
- `web/domain/metrics/identity.js`
- `web/domain/metrics/catalog.js`
- `web/domain/report/fields.js`
- `gateway/ocr.py`
- `tests/browser.ocr-tables.js`
- `tests/metric_identity.test.mjs`
- `docs/REPAIR_R38_OCR_FLOW.md`

## 必查行为

### 录入网络边界

- 选图后检查按钮文案为“下一步：核信息（不上传）”。
- 点击该按钮时，网络请求中不得出现 `/api/ocr`，页面只进入核对步骤。
- 点击“上传并识别”才允许出现一次 OCR 请求；不得自动保存、自动确认或跳过逐项核对。
- OCR 等待、成功、零候选、取消和迟到响应都不得把手工修改覆盖或自动保存。

### 指标身份和单位

使用固定虚构输入覆盖：

- `谷丙转氨酶 + U/L` → `ALT（谷丙转氨酶）`。
- `谷草转氨酶 + U/L` → `AST（谷草转氨酶）`。
- `前白蛋白 + g/L` → 前白蛋白、单位 `g/L`。
- 损坏重复名称如 `RBC RBC`、`PCTPCT` 不得静默归并为正式医学指标。
- 原始名称、单位、来源行和参考范围必须仍可追溯；未知或缺失信息必须标记待核对，不得猜测。

### 持久化和兼容

至少复跑一次：OCR 候选→用户确认→本机保存→新进程恢复读取；确认原文证据、来源行、单位和指标身份不丢失。检查旧格式兼容测试没有被新映射绕过。

## 必跑验证

在仓库根目录执行：

```bash
npm test
PYTHONPATH=. python3 -B tools/verify_debt.py --output evidence/r38-independent-audit
```

核对 `evidence/r38-ocr-fix01/result.json`：作者证据应为 `ok: true`、66 项检查 PASS、`paidProviderCalls: 0`。独立审计必须重新运行，不得只复述该文件。

公网只做 GET 级资源一致性核对：

- `https://qui-ecological-diane-even.trycloudflare.com/health`
- `/index.html`
- `/app/editor_flow.js`
- `/features/editor.js`
- `/sw.js`
- `/domain/metrics/identity.js`

将响应状态、字节数和 SHA256 与本地 `web/` 文件比对。不得上传图片，不得调用 `/api/ocr`，不得保存或恢复真实记录。公网核对证据仅说明资源一致和 OCR 开关状态，不等同于真实 OCR、iPhone 内存、低空间、BFCache、本人或临床验收。

## 结论格式

请分别给出：

1. 功能结论：通过 / 附条件通过 / 不通过。
2. 技术债结论：列出本片新发现的 P0/P1/P2/P3，区分可复现代码缺陷、测试夹具缺陷和证据缺口。
3. 每个结论对应的命令、日志、源码路径和 SHA256 证据。
4. 明确哪些内容没有被本轮覆盖：真实 OCR 准确率、LOINC 覆盖、iPhone 内存、真实低空间、BFCache、本人/临床验收、真实患者资料和付费额度。
5. 若发现问题，只提出最小修复和复验标准；不要自动修复、合入、重启公网或扩大验收声明。

审计报告必须记录：审计时间、工作树指纹、实际运行命令、通过/失败数量、失败原文、浏览器 profile/PID 绑定和公网 GET 证据索引。不得把作者报告中的文字当作独立执行证据。
