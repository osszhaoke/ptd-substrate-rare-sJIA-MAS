# R23｜启动入口故障兜底：完整验证及本地采用完成

[可直接转发的独立复审提示词](REVIEW_STARTUP_R23.md)。本次余项是审计方核对最终根字节和采用回执；不需再次批准实施。

P2-D01 的修复已完成并采用到本地产品根。准确完整作者窗口通过 60 项必需检查、94 Node、53 Python；独立方已在**同一准确候选**完成启动定向复验及指定图片旧响应回放。独立方尚未核对本次采用后的产品根和回执，没有独立完整重跑 60 项、本人手机或临床签收。

公网仍已到期，本轮未恢复、续期或访问旧公网；未新增腾讯调用、保存真实记录或读取真实数据库、密钥、费用账本。未重读私人图片或旧响应，仅核验独立报告和公开摘要。

## 最小修复与效果

启动模块自身或两个静态直接依赖加载失败，会发生在模块体执行之前，模块内部创建的提示与 try/catch 无法生效。HTML 初始 main 现在自带独立 panel：解释等待、暂时打不开及记录不会清空，提供 `href="/"` 手动重开链接。正常 main 渲染自然替换它；不依赖 JS 成功执行，不需要新增 CSS 才具备语义。

没有 inline script、CSP 放宽、自动刷新、上传或写重试，没有新锁、timer、Store、队列、轮询、依赖或临床规则。业务数据十倍时仍只是固定 HTML 开销。业务 main、startup 模块、网关、存储、医学规则和原探针源码未改。

## 当前准确身份

| 项目 | 当前证据 |
| --- | --- |
| 唯一产品根与 Writer | `/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`，当前会话为指定 H5 Writer；主 PTDS 与审计目录未写 |
| 静态补丁 | `r19-startup01`／R23；staticVersion `7859252c9ed293a4`；本地采用，不是公网发布 |
| 完整窗口 | [r23-verification04/result.json](../evidence/r23-verification04/result.json)：60 必需项、94 Node、53 Python、226 输入 |
| fingerprint | `b4ce9d008c4365592f2b5229695be05d958c5db455a699cb8f205629b4e98906`，根 adopted proof 逐项匹配 |
| 本次采用 | [adoption-result.json](../evidence/r23-adoption01/adoption-result.json)，七处准确前后 Hash，前次 R22 回执 Hash 串联 |
| 七处差量 | `web/index.html`、`web/sw.js`、`tests/browser.startup.js`、`tests/test_startup_runner.py`、`tools/test_plan.json`、`deploy/STATIC_MANIFEST.json`、`PUBLIC_SOURCE_MANIFEST.json` |
| 回退原字节 | `runtime/r23-source-before01` 与采用回执；本轮未执行回退 |
| 旧封存包 | `deploy/PTDS-H5-sjia-mas-r19.zip` SHA256 `751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d`，不含本次修复，未重打包 |

完整采用链为 R21→R22 首次→R22 样式续修→本次 R23；入口见 `STATUS.json.staticPatch.adoptionChain`。旧 ZIP、`SOURCE_MANIFEST.json` 和 productTreeSha256 仍是历史包身份，不能用来声称本次同版。无 push、tag 或新发布。

## 实际验证与失败对账

- [原版复现](../evidence/r23-original01/result.json)：startup、plan、task 各 503，三例都被 `STARTUP_FAILURE_NOT_EXPLAINED` 抓住。
- 最终窗口 [startup-wire](../evidence/r23-verification04/startup-wire/result.json)：正常入口、深层模块失败、缺 CSS 单次恢复共三组控制通过；三个引导资源各 503 后实际点击一次手动重开成功，确认未预勾，每例根导航恰两次，没有自动刷新/上传/正式写。
- 真实延迟启动资源 31 秒，实际窗口 **31689ms** 后仍有可见说明；并非修改配置或缩短期限来冒充等待。
- 五组预期失败：去样式恢复为 `STARTUP_STYLE_NOT_READY`；原入口加去兜底及仅去静态兜底的三处故障为 `STARTUP_FAILURE_NOT_EXPLAINED`。文件存在，故障由受控 HTTP 503 注入，杀死点是可见业务断言。
- [逐例失败对账](../evidence/r23-resume01/failure-reconciliation.json)：原 R22 的 22 个预期失败叶子错误不变，新增仅三处去兜底反例，共 25 个；没有新增意外失败。不能混称所有尝试全绿。
- 当前连续 1k→3k→6k→10k 同 profile 规模窗口、问诊、备份、64MiB 合成原件、五种尺寸/字体、离线/更新、新进程读回均按原门槛通过。万条状态冷 p95 350ms、暖 1ms，只说明该窗口过门槛，不能反推历史异常消失或宣称本次提速。

## 独立证据及其边界

[原 R21/R22 独立审计](/Users/osszhaoke/Downloads/PTDS-Flash-R21-R22-independent-audit-20261109-01/REPORT.md) 发现 P2-D01，原结论为附条件通过。

[独立 R23 定向补充](/Users/osszhaoke/Downloads/PTDS-Flash-R23-independent-review-20261110-01/REVIEW_ADDENDUM.md) 在独立副本运行 12 个进程：7 正控制通过、5 原版/变异被业务断言抓住，真实延迟 31601ms。它没有执行采用或完整 60 项。

[指定图片独立回放报告](/Users/osszhaoke/Downloads/PTDS-Flash-image-local-review-20261110-01/REPORT.md)：准确图片和 178 行旧腾讯响应在本地页面得到 5 项受支持候选，原图定位、修改展示、容器内缩放和离页释放通过。0 新供应商调用、0 服务端 POST、0 正式记录。**这不是本轮腾讯实时识别成功**，不代表所有报告项目均结构化，也不等于本人/临床验收。私有资料不进入产品仓库。

上述独立报告明确绑定同一 fingerprint `b4ce…8906`；[候选核同记录](../evidence/r23-resume01/candidate-reconciliation.json) 与最终根完整 proof 相符。角色仍分开：独立定向与图片回放已通过；作者完整验证及准确采用已完成；采用后根/回执的独立复核待审计方完成。

## 早期失败、工具实验与环境校正

旧完整窗口01失败于既有 review-mutations 控制超时，02/03及部分诊断被中断；不能拼接成最终04通过。对探针激活、GUI policy、窗口样式的试验均未稳定解决，**全部撤回**，最终原探针源码/生成二进制字节不变。相关原件、原日志和未接受产物均保留。

此前我用错误字面字典键读取控制台并将缺项默认 false，因而“无活动控制台”的断言无效；不能把所有等待唯一归因锁屏。现在使用系统 `kCGSessionOnConsoleKey` 常量得到活动控制台 true，锁屏字段缺失记 null，不冒充明确 false。证据及报告 Hash：[resume binding](../evidence/r23-resume01/binding.json)。旧 `r23-screen-state01` 和 `tools/test_plan.json.browserExecutionEnvironment.blockedAttemptObservation` 是当时误诊记录，**以本节与 DECISIONS 最新 R23 续做校正为准**；不将误诊当作验证前提，原失败仍然保留。最终04直接使用原探针、断言和时限成功，不依赖任何窗口策略修改。

长等待准备也曾两次未被接受；最终真实 HTTP 延迟通过单调时钟证明。续做脚本最初 cwd 误用失败，没有改动冻结源；记录在 [preparation-failure.json](../evidence/r23-resume01/preparation-failure.json)。没有放宽业务断言、150/165/175 秒时限、限流、配额或容量。

## 债务与交接

[最终定向债务扫描](../evidence/r23-debt-scan.json)：P2-D01 已修复并本地采用，本范围已知可复现待修代码项 0；26 个保护文件与 R22 逐字一致。独立方已确认同版候选的定向修复，本次采用回执复核尚待完成，不替审计方签关闭。

继续保留历史性能/运输异常未唯一归因、手机总内存、真实低空间、本人及临床签收、系统级 BFCache 等边界，不称全部技术债清零或扩大临床/公网声明。公网原截止 2026-11-09 23:59 已过，没有恢复或延期。

用户可将页首复审提示词发给原审计方，聚焦最终准确完整窗口、采用回执与根字节核同；不需重传图片或重新收费。开发至此完成并停止，等待独立采用复核反馈；AIh 未计量。
