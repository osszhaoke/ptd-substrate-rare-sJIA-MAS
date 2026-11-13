# R29 独立复审提示词

将下方全文交给独立审计AI。[作者修复报告与证据入口](REPAIR_R29.md)。请以实际源码、输入绑定和运行结果裁决，不把作者通过当独立关闭。

---

你是独立审计方。复审R28-A01/P2：R27旧已确认记录本机可读，同一加密备份却在R28因REPORT_ORIGIN_MISMATCH无法恢复。检查R29是否恢复严格历史兼容，同时保留R28新写入保护；分别给功能、技术债及总判定，明确问题关闭/保留与证据。不自动修复、合入、操作服务或恢复公网。

## 权限

唯一产品根`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`只读；先读STATUS.json、ACCEPTANCE.json、AUTHORIZATION.json、SOURCE_MANIFEST.json、DECISIONS.md最新R29、docs/REPAIR_R29.md。原独立报告`/Users/osszhaoke/Downloads/PTDS-Flash-R28-independent-review-20261111-01/REPORT.md`及证据只读、不改写或解封旧包。

输出到你自己的新独立目录。可按完整proof逐Hash复制全部绑定输入，加必要治理、来源索引、已存在的工具二进制，建立虚构UUID浏览器实例、随机本机端口和假供应商。禁止直接复制私有runtime，禁止在产品根跑构建/verify_debt；需要旧字节按Git固定提交取并逐Hash校对。无需读取患者资料。

不得读密钥、Terminal、进程环境、.env、试用码、真实预算账本、正式病程库、个人浏览器或第三批健康资料。不新增真实OCR或重试index200，不重置预算，不启停/热重载现有服务、安装依赖、唤醒其他Agent、改Writer或发布。

## 准确身份

采用与来源索引：evidence/r29-adoption01/adoption-result.json、manifest-validation.json、SOURCE_MANIFEST.json。完整作者proof：evidence/r29-verification01/result.json。原失败、工具修正和同根扫描：evidence/r29-repair01。

- 产品及证据提交：`bd155cadf4726f13a905f3712ecbd69d023f87f7`；后续文档提交不改变257绑定输入。
- 静态修复r19-restore01，staticVersion `8d16c8db0b4a0edb`。
- 257输入fingerprint `3b1dd760cdcb840c526fb903984d98d8e2a8710a2f83b25e8f565bb6258e56b9`；完整61项、127 Node、54 Python通过。
- mandatory report-rows-wire：44窗口，34正向、10有效预期变异；16组不同PID同库读回。
- R28→R29实际26路径：17新增、无删除，231输入未变；129来源索引及5拒绝控制通过。
- 一次web原子交换与双树正逆回放准确；91资源+SW实际GET准确，PID45593未变，重启/新增真实OCR均0。
- 原34个预期失败按id/错误类型/消息与除随机profile外cfg逐例一致；新增1个去兼容预期失败，现35个。


旧R19 ZIP SHA256仍为751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d，不含本轮修复。静态GET不等于当前网关内存加载或本人验收。

## 必须关闭的行为

1. **同一旧密文**：tests/fixtures/r27-footer-backup.ptds，377268字节，SHA256=8130233a30cc090d05655aed74445ee0bb7c6e66b9ac380d2b36ea04708661e2，虚构密码fictional-history-password。和原独立目录historical-backup-bytes/r27-fictional-encrypted-backup.ptds核同；不要只新造一个能通过的备份替代。未修R28应失败REPORT_ORIGIN_MISMATCH；R29应inspect及恢复成功28项含旧999。准确旧event/source/原图/receipt/digest不改，reviews不恢复，inspect零导入；再导出恢复及不同PID同一profile读回必须保全。
2. **恢复专用**：严格先验证整条当前候选集合，仅REPORT_ORIGIN_MISMATCH再用冻结R27解释验证整条；不逐行混用或忽略origin/ocrOrigin。其他错误不吞。未标版旧备份只称匹配精确白名单解释，不从日期/文件名声称知道写入版本，不暗示任意旧版都支持。
3. **新写保护保留**：当前新OCR仍27项，不复活页脚999；新stage/save不得接受旧28项或残缺单位。已确认旧mg/字面可读/可恢复的许可不等于能在新录入时继续写入。保留原左右5项、五类单位入口、修改撤销勾选、CBC/旋转/定性/原文等闭环。检查正常旧CBC及旧mg/的历史控制；作者本轮这两项只有构造单元控制，原R28独审有实际旧UI控制，勿混作R29新执行。可用你自己的新目录重演原独立历史脚本，勿写其封存路径。
4. **反例**：伪造origin、ocrOrigin、来源行、原图、receipt或重复消费候选、损坏密文必须拒绝且零导入。原密文认证、schema/event digest、source hash/binding/ownership、OCR-origin、冲突预览和事务重查不可被跳过。检查整条新旧混合反例确有两端各自独有origin，不能退化成无效夹具。
5. **快照真实性与边界**：web/compat/r27/LOCK.json绑定fd59e94b4847d7881f5a90fe662a0c710f6738e5的14个JS模块56,526字节。逐文件原Git SHA/大小、递归import闭包与额外文件检查。无旧service、Store、网络、timer、锁或旧目录热引用，无import改写，无新增依赖；只有恢复helper使用快照，stage/save仍当前解析器。不要把固定历史纯解析闭包误当第二存储引擎，也不要忽视它的维护边界。
6. **行为变异**：移除历史fallback后同一旧文件应被实际恢复断言杀死HISTORICAL_BACKUP_REJECTED REPORT_ORIGIN_MISMATCH，未变异正控制通过；不接受语法/缺文件/预检拒绝冒充。原9个报告变异和其他历史有效预期失败保留并逐例对账，不把预期反例算新增产品故障。

## 可运行入口（仅隔离副本，串行，新输出）

```sh
node --test tests/report_rows.test.mjs tests/report_contract.test.mjs
python3 -B -m tests.test_report_rows_runner --output evidence/independent-r29-report01
```

原mandatory report-rows-wire中加入历史恢复、不同PID读回、六拒绝反例及去兼容变异，未新增隐蔽未登记测试入口。绑定文件包含虚构旧密文，cfg通过stdin传base64；无需修改HTTP文件后缀白名单或公开备份下载。

按风险可运行完整既有61白名单：

```sh
python3 -B -m tools.verify_debt --output evidence/independent-r29-full01
```

构建将生成shell/SW/manifest，生成后必须与冻结身份一致。不得discovery或跑主PTDS大规模测试。没实际跑完整61必须写未独立全套重跑；作者结果不可代跑。检查新PID与准确工具/输入Hash，保留失败与修后新编号；原targeted01的新反例错误码预期曾写错，已修为更早保护实际返回的SOURCE_LINE_MISSING，不应隐藏原失败。

## 技术债与结果边界

核对准确差量、before/after、新增快照闭包、双树正逆回放和来源索引5个旧/缺/陈旧证明拒绝控制。检查原Store/锁/网关/医学规则/前端大文件不变；100行、20k片段、<1000ms、万条/64MiB备份及所有旧门槛不放宽。历史只在当前origin不匹配时多一次解析、固定一个版本，不累积无界缓存/队列；单次性能通过不等于始终达标或iPhone内存通过。

R27-A01/A02已经独立R28按新写入范围关闭，勿在R29覆盖旧关闭证据。R28-A01只能由你实际复审后独立关闭。继续保留iPhone内存/真实低空间/BFCache、当前本人及临床验收、历史性能唯一归因和持密钥进程加载证据缺口。不给“全部技术债清零/真实预警通过/公网可用”结论。

输出新报告、关闭表、命令/环境/PID/输入与工具Hash、反例和证据索引；不改产品或治理。正式回执按R02单张五字段卡≤500非空白Unicode字符，附一条报告链接。

## 新增性能观察请单列

除完整61外，作者另加“完整兼容校验<1000ms”实验。2万片段约1500ms未达标；分解当前解析808ms、冻结解析746ms，各自在原单次1000ms内。见evidence/r29-repair01/history-scale.log（原失败）、history-scale02.json/03.json及diagnose_scale03.mjs。不要称所有性能检查通过，也不要把新aggregate门槛替换原门槛后关闭失败。该脚本仅额外观察，未偷偷加入或替换原61名单；可改导入到你自己的准确副本及新输出复测，勿直接执行其中指回作者目录的路径。评估两次解析的有限开销是否影响恢复交互，决定保留观察或新建性能问题；不能据本窗口唯一归因所有历史波动。作者没有擅自改冻结解析器、扩写当前parser或作额外重构。
