# R30：首次正式保存来源保护及默认验收索引修复

针对独立R29-A01/P2（旧未确认草稿升级后绕过当前来源保护）和R29-A02/P3（顶层默认验收摘要仍指R28）。旧已确认正式备份恢复R28-A01已由独立R29关闭，本轮保留其有效兼容，不把它扩展到旧未确认草稿。

[外部独立复审提示词](AUDIT_REVIEW_R30.md)。作者验证、采用与独立关闭分层；本轮未启停、热重载现有服务，未读凭据、真实账本、正式库或患者资料，未新增真实OCR或恢复公网。AIh未计量。

## 修复与最小结构

service.stage和首次正式save共享web/domain/write_binding.js的当前写入校验：原图字节Hash、ledger/来源摘要、来源行、单位完整性、当前report origin和OCR-origin。原stage校验片段逐字移入共享模块；save新增调用，不能从旧草稿或直接调用绕过。它不调用restore helper或冻结历史解析器。

save固定一份review副本，避免调用方在异步读取期间改写待验证内容。已有receipt交给原Store.commit裁决幂等/冲突/删除，不按新候选重解析已正式提交的旧事件。首次有来源的save只读取绑定source，先确认id/hash/binding匹配，在IDB写事务外校验；随后原commit继续核对revision/digest/confirmation/source。无来源手工保存不增加这项预读或解析。

UI针对来源不匹配/单位残缺，提示尚未保存并指向已有“返回修改”。拒绝不删除草稿或原图，不改请求ID自动重发；用户实际移除页脚或补单位、重新核对暂存后，才按原流程生成新revision/requestId并明确确认。

同一闭环另发现：跨进程恢复原图后，重新stage会把同一Blob put回相同key，原图在暂存前可读、暂存后读取发生NotFoundError。stage现在复用同id/hash/bindingDigest的已有原件，不重复写未变Blob；来源不存在或变更才put。原事务、CAS、ownership和来源替换清理仍有效，无新增Store/锁/依赖。该修复及写集补充先登记到DECISIONS及plan，不把原失败归为测试噪声。

没有扩医学映射、改当前parser、旧快照、备份格式、网关、前端main或容量/预算。每次首次有来源保存多一次当前来源Hash/解析；已有回执不解析，100行/20k片段和所有原门槛不变。不把必要事务一致性保护算全局锁债务。

## 实际旧页面与来源绑定

tests/fixtures/r27-draft-web.tgz为固定R27提交fd59e94b4847d7881f5a90fe662a0c710f6738e5的79个web资产，确定性归档；lock逐文件原SHA/大小、路径全集和归档Hash，runner严格核对后仅解到自己的新测试输出。它只作为虚构升级测试的旧页面，不进入产品加载链，不热引用旧目录，不依赖测试方有旧Git或私有runtime。

通用run_browser在old-stage窗口仍记录当前工具树；实际旧服务字节另由r27-served-hashes及各组actual-served-roots绑定，不能把通用binding冒称旧源。当前窗口使用明确当前/变异root的全Hash，所有窗口独立PID，同一组保留同UUID库，只清理该虚构profile的SW/cache；没有插库、预设正式确认或拿缓存冒充记录。

## 回归与反例

修复前已实际复现旧R27 UI暂存28项且未确认、正式记录0→新PID恢复确认后正式保存28项，UPGRADE_OLD_DRAFT_SAVED断言失败，见baseline01。修后footer和mg/两组各五窗口：旧stage→当前拒绝→新PID零记录/零回执及草稿原图保全→返回修改、明确重暂存确认→新PID读回27项。另有效旧CBC三窗口直接保存及新PID读回、重复请求返回同回执、冲突仍拒绝。

移除save当前绑定，实际升级UI保存断言失败；移除原件复用，修改后原件读取断言失败。两者都有完整未变异正控制，非语法/缺文件/前置检查失败。Node另测伪造原图/ledger、丢失source、残缺单位、当前有效保存、原commit CAS/确认失败、已有历史receipt幂等/冲突/墓碑，以及异步调用方改review不改变本次已验证快照。

旧正式加密备份同一精确fixture恢复及新PID控制、六类篡改拒绝、去兼容变异和新旧origin不能混搭仍在mandatory report-rows-wire保留。原9个页面变异、旧保存/恢复/万条/64MiB等继续由原完整61入口执行。

## 验收索引防复发

tools/acceptance_index.py复用require_verification绑定当前全部输入，再从实际Node/Python日志导出默认author、currentProof、verificationEvidence、verificationBinding、checks/nodeTests/pythonTests。显式--apply仅更新治理索引并保留旧默认摘要；validate检查这些别名及staticPatch的proof/binding必须一致。不会把本人/临床/设备标成通过。

新反例已登记到既有tests.test_debt_build_gate白名单模块：分别篡改每个顶层字段及patch别名均拒绝，修正保留历史且幂等。最终采用后另外实际跑当前索引校验；产品proof不包含治理文件，不能仅靠产品测试推断治理已同步。

## 失败记录及边界

upgrade01/02保存修改后的草稿失败；增加保存前直接读取原件的断言，upgrade03稳定定位重复put后Blob不可读；修改Store最小复用分支后upgrade04整个闭环及两变异通过，原三次失败留存。不是所有尝试最初全绿。一次索引工具准备误用了候选cwd，目标文件未写成，shell最后旧模块测试返回0不能作新测试通过；index-preparation-failure01登记，正确路径新编号index-unit02才运行新增检查。

R29总判定不通过和旧正式恢复关闭结论原样保留。R30作者已修待独立复审，不自行关闭R29新增两项。性能观察O29-01仍开放：历史完整兼容2万片段约1.5秒的aggregate1000ms实验未达标；这轮不重做性能重构或拼接旧样本。手机内存/真实低空间/BFCache、本人/临床、网关持密钥进程加载、历史性能唯一归因缺口不扩大。原R19 ZIP不改且不含R30，旧独立包和作者历史证据不清理。

## 准确交付身份

- 最终产品/证据提交：`e6e19976a41f4a687062b87d7556637baee5583b`；纯搬移组件提交：`5a3ccdd1022346d63447d1572bb1493f4f22aca5`，后续文档提交不改变263绑定输入。
- 静态修复r19-save01，staticVersion `f5079cbdc06b2bc6`。
- 263输入fingerprint `14a437750d0b84b00c266dff2888684b6f70a930b4c52d52ccfcc82943690649`；完整61项、130 Node、55 Python通过。
- mandatory报告runner：63窗口，51正向、12有效预期变异；包含3组跨版本13个完整正向窗口及两条去保护反例。
- R29→R30实际18路径：6新增、无删除，245输入未变；131来源索引及5拒绝控制通过。
- 一次web原子交换及双树精确正逆回放；新增真实OCR/服务重启0，旧ZIP不变，公网不恢复。
- 原35个预期失败逐例id/错误类型/消息及除profile外配置一致；新增2个，共37。


## 结构搬移证据

原stage校验片段完整逐字出现在write_binding模块，pure-extract-result.json绑定原片段Hash、纯搬移service/helper字节；先执行原4条stage/单位关键行为对照通过。纯搬移和首次保存/原件复用语义修复分别提交，纯搬移提交是中间审阅组件，不是采用或独立验收版本；实际运行/采用身份始终以最终263输入完整proof为准。

本机92项资源及SW的GET字节与本版清单一致，PID45593未变；GET只能证明静态资源，不能证明历史网关代码已重新加载。最终默认索引CLI正向检查通过，源码/清单/日志与实际计数130 Node、55 Python一致。
