# R38 后续验证收口

## P3 测试覆盖缺口

审计指出 OCR 表格浏览器夹具只检查了按钮文字，没有验证“下一步：核信息（不上传）”的网络边界。已在 `tests/browser.ocr-tables.js` 补入请求计数：选图后先点击核信息并断言 `/api/ocr` 请求数为 0，再返回资料页执行现有上传、取消、零候选、候选保存恢复和变异测试。若将核信息按钮错误接到 OCR，请求计数会直接失败。

定向夹具结果：`evidence/r38-independent-audit/ocr-tables-wire-r38-recheck/result.json`，虚构供应商调用 3 次、付费调用 0 次，所有场景通过。

## 性能窗口

R38 原始独立完整窗口的 10,000 条累计冷读 P95=1145ms 失败证据保留在 `evidence/r38-independent-audit/result.json`，没有被覆盖。随后使用同一 Mac WebKit 环境、每次全新 profile、直接构造 10,000 条记录重复三次：

| 窗口 | 冷读 P95 | 热读 P95 |
|---|---:|---:|
| 1 | 433ms | 1ms |
| 2 | 623ms | 2ms |
| 3 | 480ms | 1ms |

证据：`evidence/r38-independent-audit/state-scale-repeat01/summary.json`。这支持“新鲜窗口当前通过”，但不能唯一解释累计窗口的历史波动，也不宣称手机性能始终达标。

## 当前验证

- `npm test`：167/167 PASS。
- 当前源码绑定重新执行 `tools/verify_debt.py`：66/66 PASS，绑定 `e7a51a4548f9a44f71402c019b5ee831205697b6b8ad97c850e51cbb149b1987`，结果 `evidence/r38-independent-audit/verify-followup/result.json`。
- 未进行真实 OCR、未读取密钥、未修改公网服务或患者资料。

## 仍保留的边界

性能原因尚未唯一定位；iPhone 内存、真实低空间、BFCache、LOINC 覆盖、本人验收、临床验收和真实语料准确率仍未完成。后续若继续性能工作，应固定环境和窗口顺序，分别记录累计窗口与新鲜窗口，不能用单次通过关闭历史观察。
