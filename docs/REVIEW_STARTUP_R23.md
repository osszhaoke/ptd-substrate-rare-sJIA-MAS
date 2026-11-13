# 可直接转发：P2-D01 启动兜底修复独立复审

请对 `/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5` 的 R23 做独立只读复审，不自动修复、发布、启停服务、续期或联系其他 Agent。

先读你方原审计 `/Users/osszhaoke/Downloads/PTDS-Flash-R21-R22-independent-audit-20261109-01/REPORT.md` 的 P2-D01，再读产品 `docs/STARTUP_FALLBACK_R23.md`、`STATUS.json.staticPatch`、`STATUS.json.auditR23` 及其最新采用回执/验证证据。核对当前所有输入集合和 Hash，不承接开发方 PASS；原 R22 审计通过范围不挪作 R23 已验收。

本片仅修改 HTML 初始 main 占位，增加独立等待/失败解释和同源手动重开链接；不依赖 startup.js、startup_plan.js、startup_task.js 成功执行。正常 main 渲染自然替换它。测试及 coverage 更新，SW/静态/公网清单重生成。原探针源码和二进制不改；验证需可运行的图形环境，超时与中断不作通过，早期环境误诊已另行校正。产品启动模块、主入口 main、Store、医学规则、网关、预算、CSP 和业务容量应与 R22 逐字不变。

原工程和历史证据只读。需要运行时，在新独立审计目录复制验证 fingerprint 的准确白名单及必要公开探针/QR 二进制；排除 runtime、真实数据、密钥、账本及患者 profile。仅用自有回环临时端口、全新虚构 UUID profile 和假供应商。不要读取私有微信图片或响应，不做真实 OCR 请求；公网原截止已过，不恢复访问或续期。只在审计目录写新报告/日志，不安装依赖。

必验：

1. `/app/startup.js`、`/app/startup_plan.js`、`/app/startup_task.js` 各自返回 503 时，可见且可理解的说明和同源根链接始终存在；main 未运行、没有自动刷新、OCR 上传或正式写入。资源恢复后，实际点击该链接可重开并进入开始页，确认仍未勾选，兜底不残留。
2. 启动资源延迟超过 30 秒再失败时，也必须有说明和重开路径。核查原始请求/elapsed；不得用改小产品反馈期限或“长等待配置存在”代替实际等待。正常加载、深层模块失败、缺 CSS 单次恢复及缺样式保护移除反例继续通过。
3. 分别删除静态兜底但保留三个资源文件，通过受控 503 复验。三例都应被 `STARTUP_FAILURE_NOT_EXPLAINED` 的可见行为断言杀死，不能由缺文件、Hash 门禁或探针超时冒充。
4. 原 HTML、CSS、CSP、链接语义、成功页布局和旧离线/更新策略检查。新 HTML 不能引入 inline script、自动 reload、权限重放、清数据、Store、锁、计时器或依赖。初始提示不依赖 CSS/JS 才有语义。检查页面内现有启动失败面板与静态提示同时出现时是否仍清楚可用。
5. 检查环境诊断校正：早期使用错误字面键并将缺项默认 false，不能据此认定无活动控制台或将所有等待唯一归因锁屏。当前用系统 kCGSessionOnConsoleKey 常量；缺失锁屏字段记 null，不冒充 false。tools/test_plan.json.browserExecutionEnvironment 中旧 blockedAttemptObservation 是历史误诊记录，以 DECISIONS 最新校正和本批最终报告为准。探针激活/窗口实验均撤回，原探针逐字不变。旧失败/中断仍不能算通过，最终完整新窗口须含原控制和有效反例，不放宽 150/165/175 秒时限。
6. 当前准确输入与采用前后差量一致，旧 ZIP 不变；最末回执只是 R23 增量，旧功能由此前采用链还原。所有失败尝试、长等待工具修正和原始 P2 复现保留，不能把后来修复借给旧组合。

可在独立副本执行 `python3 -B -m tests.test_startup_runner --output <新目录>`。该入口包括 3 处失败后手动恢复、真实 31 秒 HTTP 延迟、3 处去兜底反例及原 CSS/深层模块控制。必要时按 `tools/test_plan.json` 与 `python3 -B -m tools.verify_debt --output <新目录>` 全量验证；build/verify 会生成静态文件，严禁在受审产品根直接执行。不得无差别发现主 PTDS 测试。

给出通过／附条件通过／不通过；明确 P2-D01 是否可关闭，以及每项新问题的步骤、预期/实际、路径、证据、严重度和最小建议。区分独立新运行、作者记录及静态审阅，未做的项目列明。保留历史性能观察、iPhone 总内存、真实低空间、本人/临床和系统级 BFCache 等边界，不因本项修复扩大验收。报告只写你的独立目录。


补充交接：已有 `/Users/osszhaoke/Downloads/PTDS-Flash-R23-independent-review-20261110-01/REVIEW_ADDENDUM.md` 的准确候选定向复验与 `/Users/osszhaoke/Downloads/PTDS-Flash-image-local-review-20261110-01/REPORT.md` 的旧响应图片回放独立结果。请先核对它们与最新产品准确输入，再聚焦完整作者窗口、预期失败逐例对账和本地采用链；不重复读取私有输入或再次收费。已有定向独立通过不等于本次采用后根字节已被审计方核对，不等于独立完整60项或本人/临床签收。
