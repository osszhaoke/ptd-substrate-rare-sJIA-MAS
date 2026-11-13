# R34：R33 P1 严格名称匹配修复——交原独立审计会话

用户转交会话 `01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6`。先读 DECISIONS 最新R34、`docs/OCR_STATE_R34.md`、`evidence/r34-alias02/result.json`、`plan.json`、`candidate-binding.json`、`delta.json`。本轮作者修复不等于独立关闭P1；旧R33不通过及原失败证据全部保留。

正式根 `/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5` 仍A2、270输入、`34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d`。新隔离候选 `evidence/r34-alias02/candidate`；R33父版本为 `d72d1f9281040b43a074102b31d0aa30d685e9f6d99f7ba3adb2fb6b4e325713`。以最终绑定逐文件核对，不根据目录名推定版本。旧R33封存包不改。R34-alias01是保留的中间停点：完整门槛通过后缓存对照发现10行合法双语组合仍被保守分开，因此续做alias02，不能用01结果代替02最终组合。

审计仅读产品，只写自有副本/虚构测试与日志。不能采用、重启/操作已有服务或公网、读正式浏览器库、真实图像/原OCR私有缓存、密钥/费用账本；不调用收费OCR、不安装工具。本提示词不扩大原私有资料读取授权。完成后用户回传，不替Writer采用或扩大临床声明。

## 修复语义

1. 展示身份两条分支统一完整名称匹配：原 `matches()` 无限分词及调用旧 `metricCode()` 的入口均已移除。原医学解析器/保存协议不改；状态仍以schema3的reportRows为权威。
2. 合法单名称及有限显式双语名称保留。双语组合逐字符串登记在catalog的DISPLAY_BILINGUAL，只允许登记的完整规范化名称，不对任意别名做排列/重复。无法判断或损坏的名称按原名保留，不并入正式指标。连写数字不再猜成序号去掉。
3. PCT两个含义、绝对计数/百分比及单位隔离保持；不改医学规则、数据库、备份wire或新增锁/后台任务。
4. 原R27旧页面失败另有测试工具路径问题：在/tmp下将server.root直接换为未规范化路径，候选网关将请求解析为/private/tmp后正确拒绝。仅两个测试工具的root切换加resolve(strict=True)，不改网关保护/冻结旧夹具/业务断言。

## 独立复验顺序

- 先核源与工具Hash、前台解锁、可用磁盘、无其他GUI/性能任务。缺工具仅从本包Swift编译browser-probe/public-qr；记录新二进制身份。不延长既有时限，不拼失败窗口。
- `node --test tests/metric_identity.test.mjs tests/metric_series.test.mjs`：每个登记别名的2次/3次重复、带空格重复、已知P1反例、剩余字符、脑脊液前缀、25RBC，以及合法单名/双语/单位对照。自行新增未预见的损坏名称。
- 重点复跑独立原例：RBC=4.50与RBC RBC=6.00必须分组；有第二份合法RBC=5.50时，合法差值仅为1，损坏行不能成为其最新值或贡献差值。HbHb、CRPCRP、PLTPLT等原canonical分支也不能被遗漏。
- `python3 -B -m tests.test_metrics_runner --output evidence/<new-id>`：原30组/60点完整录入路径保留，另有3份单行虚构报告经正常Service确认保存；页面核对合法组/损坏组、损坏原文与来源定位/返回、加密恢复及真正不同PID读回。自动测试操作员不算本人验收。五个变异均须被业务断言拒绝；repeat-alias-merge应由名称/错误趋势断言杀死，不能用模块加载失败充数。
- `npm test`以及完整原66门槛：`python3 -B -m tools.verify_debt --output /tmp/<new-independent-id>`。本轮故意要求/tmp输出，确保旧R27 old-stage及普通SW升级/回退测试都实际经过符号路径。另在自有目录复验正常非别名路径可用、目录外请求仍拒绝。保持原1000ms性能断言及所有旧业务断言。
- 重点检查完整report-rows-wire：footer/unit/valid旧页面→新页面首次保存→修正后保存→不同PID读回，以及原错误保存/来源重用两变异。作者通过不能代替独立同版完成。
- 对最终候选再做1k/10k指标查询/投影/DOM与原事务审查；不能把Mac结果外推手机内存。

## 交付

给出REPORT、完整绑定、命令/证据索引、功能/技术债/总判定，明确P1-001是关闭、未关闭或证据不足；若完整门槛止步，保留首错误及实际完成数，不改写为全通过。原R33独立不通过不能被新作者结果覆盖。

299份缓存/1247已整理行仅为范围摘要；391空结果、162无结构化输出及未验证医学真值仍保留。性能稳定性、iPhone内存、真实低空间、BFCache、本人/临床、真实漏参考下限根因继续独立登记；不得宣称“技术债0”。

作者最终alias02身份：282输入、`5ec9f2b0a1c84f4b1993f30af70dec212a5462827adaa3602c2e20b5687f5d21`。作者完整66/166Node/55Python通过，最终证据`candidate/evidence/full03`（实际原始执行输出/tmp/ptds-r34-full03-20261112，结束后逐文件复制）。`cumulative-delta.json`记录对原失败R33的12路径差量，`delta.json`为对停点01的5路径差量。`identity-delta-summary.json`记录合法双语覆盖补齐，不授权读取私有明细。CGSession字段不可用，不将作者样本声明为已核前台解锁或性能稳定性验收。请独立核验这些边界。
