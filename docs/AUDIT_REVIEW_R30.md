# R30 独立定向复审提示词

可将下文直接交给独立审计AI。[修复报告与完整证据说明](REPAIR_R30.md)。作者结果不是独立关闭。

---

你是独立审计方。复审R29-A01/P2（旧未确认草稿升级后首次正式保存绕过当前来源保护）及R29-A02/P3（默认验收索引陈旧），检查修复和同闭环原件复用是否回归。分别给功能/技术债/总判定及每项关闭/保留证据。R28-A01旧正式备份恢复已独立关闭，不能据此允许旧草稿新写，也不需回退有效恢复兼容。

## 只读权限和准确身份

唯一产品根`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。先读STATUS/ACCEPTANCE/AUTHORIZATION/SOURCE_MANIFEST、DECISIONS最新R30、docs/REPAIR_R30.md。原独立报告`/Users/osszhaoke/Downloads/PTDS-Flash-R29-independent-review-20261111-01/REPORT.md`及证据、所有旧包只读。

允许按当前完整proof的准确白名单复制输入到你自己的新独立目录，加明确治理/索引和已有probe/QR工具二进制；不整根复制或读私有runtime。新UUID、随机回环端口、假供应商可用。所有构建/测试只在隔离副本，禁止在产品根运行会改SW/manifest的verify_debt，不改产品/治理/旧证据，不自动修复/合入/发布。

不读凭据/.env/Terminal/进程环境/真实预算账本/正式病程库/个人浏览器/第三批健康资料；不新增真实OCR、重试index200、重置预算、启停或热重载现有服务、不装依赖或启动其他Agent。

- 最终产品/证据提交：`e6e19976a41f4a687062b87d7556637baee5583b`；纯搬移组件提交：`5a3ccdd1022346d63447d1572bb1493f4f22aca5`，后续文档提交不改变263绑定输入。
- 静态修复r19-save01，staticVersion `f5079cbdc06b2bc6`。
- 263输入fingerprint `14a437750d0b84b00c266dff2888684b6f70a930b4c52d52ccfcc82943690649`；完整61项、130 Node、55 Python通过。
- mandatory报告runner：63窗口，51正向、12有效预期变异；包含3组跨版本13个完整正向窗口及两条去保护反例。
- R29→R30实际18路径：6新增、无删除，245输入未变；131来源索引及5拒绝控制通过。
- 一次web原子交换及双树精确正逆回放；新增真实OCR/服务重启0，旧ZIP不变，公网不恢复。
- 原35个预期失败逐例id/错误类型/消息及除profile外配置一致；新增2个，共37。


完整作者proof=evidence/r30-verification01/result.json；采用/双树正逆/来源索引五拒绝控制=evidence/r30-adoption01；原失败/逐例对账/结构及交付校验=evidence/r30-repair01。旧R19 ZIP仍751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d，不含R30。

## 关闭标准

1. **同一旧UI暂存链**：使用绑定R27 web夹具及bilingualFooterLedger，旧页28项逐项勾选后暂存、尚未最终确认、events=receipts=0；新PID同库新页恢复，不改内容、明确勾选后保存必须拒绝。新PID仍无正式记录/回执，原草稿revision/digest/requestId、来源ledger与原图Hash不变，已有“返回修改”入口和可理解提示。不插库，不伪造本人确认，不换请求ID重发。
2. **真正修改后恢复可用**：页脚组移除999，单位组明确补全mg/，各自重新逐项核对、暂存、明确最终确认后保存27项，新PID同库读回、原件仍可读。只有实际编辑重暂存才产生新revision/requestId。有效R27旧CBC草稿无需修改可正常确认保存，旧单位直接save仍拒绝。
3. **正式save边界**：只校验stage/页面按钮不够，直接save同样当前report binding及OCR-origin、Hash、ledger/source所有权/绑定成立。shared write_binding使用当前解析器，绝不调用历史restore fallback。解析/Hash在IDB写事务外；原commit的revision/digest/confirmation/source事务重查保留。用固定review副本抵抗调用方在await间改内容。新增校验不替代CAS或确认。
4. **已有receipt幂等**：旧正式事件已存在回执时不能按新候选把重复提交误拒，仍由commit裁决同digest回执、IDEMPOTENCY_CONFLICT、RECORD_DELETED；首次有来源save才校验当前来源，无来源手工不新增解析。测试并发/版本变更不可写入旧草稿或重复计数。
5. **原件复用补充**：stage对同id/hash/bindingDigest且原属同草稿的source复用已有Blob，避免重新put同一原件后跨进程读取NotFoundError；来源改变/缺失仍写入，原ownership/CAS/替换清理不可放宽。请独立检查这不是泛化的“跳过source校验”。不改Store引擎或加全局锁。
6. **行为变异**：移除save当前绑定应由UPGRADE_OLD_DRAFT_SAVED杀死；移除同源Blob复用，应由UPGRADE_RESTAGE_SOURCE_UNREADABLE杀死。对应未变异完整闭环通过，非语法/缺文件/前置拒绝。原旧正式备份恢复/六篡改/去兼容变异和原9页面变异保留。
7. **索引P3**：顶层author/currentProof/nodeTests等与当前实际proof和日志一致，所有当前alias及staticPatch proof/binding一致；旧摘要保留，人/手机/临床未签收不改。tools.acceptance_index检查必须实际执行，修改顶层旧proof/计数/binding反例会失败，不接受新增R30块正确却默认入口仍旧。

## 定向命令（隔离副本、串行、新输出）

```sh
node --test tests/report_contract.test.mjs
python3 -B -m unittest tests.test_debt_build_gate -v
python3 -B -m tests.test_report_rows_runner --output evidence/independent-r30-report01
python3 -B -m tools.acceptance_index --proof evidence/r30-verification01/result.json
```

最后一条需要复制完整作者proof及Node/Python日志，并先require_verification核同你的隔离输入；或你自行完整跑出新的proof并在自己的副本校验新索引。不能为了它在产品根改治理，不能把导出的旧索引说成新版本验证。完整61可按风险在副本重跑：

```sh
python3 -B -m tools.verify_debt --output evidence/independent-r30-full01
```

构建生成字节仍须与冻结fingerprint一致。不discovery、不跑主PTDS大用例、未重跑61明确写未独立全套。老UI实际资产在tests/fixtures/r27-draft-web.tgz及.lock.json；归档SHA、79资产路径/大小/Hash逐项检查，固定R27 Git原件可复核。runner严查无绝对/越界路径、链接或额外源。旧通用browser binding列当前工具树，不等于旧服务源；实际r27-served-hashes和每组actual-served-roots另绑定旧/当前/变异字节，不能省略。

## 保留项与交付

检查所有准确before/after/null、双树正逆、索引5拒绝控制及作者失败逐例对账。main/当前parser/医学规则/旧历史快照/备份wire/gateway/容量/预算不变，无新Store/锁/网络/timer/依赖；原100行/20k/单次解析1000ms/万条/64MiB等门槛不放宽。首次有来源save多一次Hash和当前解析，不能凭行数少称无债。

O29-01独立性能观察保留：完整历史兼容20k约1.5秒、新aggregate1000ms未达标；本轮不把正确性修复冒充性能修复。iPhone峰值内存/低空间/BFCache/本人/临床/网关准确加载身份及历史性能唯一归因缺口继续保留。GET或health不证明网关同版；作者本轮没有新真实OCR或服务启停，不宣称公网可用或全部技术债清零。

准备失败与修后新编号全部保留，尤其upgrade01–03原件错误定位及一次错误cwd的索引准备，不能用shell最后返回0当新增测试通过。输出报告、两项关闭表、原件复用补充裁决、实跑命令/输入工具Hash/PID/失败证据，明确独立执行与作者材料核对边界。正式回执R02单张五字段≤500非空白Unicode字符，附一条报告链接。

纯搬移证据另见evidence/r30-repair01/pure-extract-result.json及对应原4条行为日志。原stage片段逐字Hash核同；纯搬移组件和后续语义修复分提交，不把中间提交当最终采用或完整验证。当前最终输入仍以263-file完整proof为准。
