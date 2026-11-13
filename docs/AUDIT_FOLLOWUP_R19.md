# R19 独立审计采纳与最小工程跟进

## 范围与当前结论

继续执行用户“实机验证通过，继续扫描或处理技术债”的既有授权，仅在唯一 H5 根内工作；主 PTDS、独立审计树、真实资料、凭据、真实费用账本与隔离留存状态均不改、不读取内容。本会话仍唯一 Writer，AIh 未计量。产品服务与公网保持暂停，仅使用自己拥有的随机回环端口、虚构测试配置与隔离浏览器 profile；真实 OCR 调用为 0。

独立审计为**附条件通过**，限被审计 R19 运行字节在本地虚构实例的工程结论。已采纳其确认的一致性修复有效、覆盖范围内无功能回归、无 P0/P1，以及下列三项边界。工具修复后的作者复验不冒充独立复审。

| 事项 | 分类与处置 | 尚不能宣称 |
|---|---|---|
| P3 图片输入绑定遗漏 | 已修复；根 fixtures 加入验证指纹，原测试实际读取的图片保持原字节 | 旧凭证覆盖了新工具组合 |
| P2 冷读取性能异常 | 原 6000 条 p95=3251ms 失败继续保留；已补分段/环境窗口，未唯一归因 | 性能始终达标、环境是唯一根因、历史卡顿已解决 |
| P2 实机专项缺证据 | R18 用户声明通过保留；R19 本人、物理内存与真实低空间未新增证据 | Mac 自动化或配额故障注入等于手机专项通过 |

指定 Tester 与临床签核仍分别待验，不被独立工程审计替代。

## 输入绑定：先抓原错，再修一行

实际依赖扫描命中 tests/test_gateway.py、test_lock_boundaries.py、test_tencent.py；均读取根 fixtures/lab.png。采用最小修复：只把 fixtures 加入 tools/verify_debt.py 的文件枚举，无依赖扫描框架、无测试路径迁移。

新增用例在既有 tests.test_debt_build_gate 实际入口执行：用准确图片字节建立临时验证输入，先确认未变接受，再分别改末字节、删除图片，要求旧凭证以 VERIFICATION_STALE_OR_MISSING_FILES 拒绝；恢复原字节再次接受。原工具上两种变更都失败于“ValueError not raised”，证明是门槛行为断言抓住缺陷，而非准备失败。修复后同组全部通过。

原失败与修复日志：[原版](../evidence/r19-audit-followup01/binding-original.log)、[修复](../evidence/r19-audit-followup01/binding-repaired.log)。新用例增加 1 个 Python 测试方法、包含两种变更子例与各自未变/恢复对照。全套验证仍使用原明确白名单，无自动发现、无断言放宽。

## 受控性能定位

运行产品的 web/gateway/deploy/public_trial 字节保持不变。测试脚本仅增加可选测量模式；完整门槛仍用未启用探针的原冷暖采样方式和原阈值。工具入口已登记 tools/test_plan.json：

`python3 -B -m tools.diagnose_state --output <new-evidence-dir>`

runner 绑定准确输入组合及探针源码/二进制、每次 PID、单个新 profile，按 1000→3000→6000→10000 正式 stage→自动化明确 confirm→save 扩容；同 profile 的千/万问诊与备份一并运行。每阶段前后环境、全部七次冷/暖样本保留，任一门槛失败即停止该窗口，不拼接成功样本。

测量包括 meta 读取、stateSnapshot、IDBIndex.getAll 派发等待，以及快照返回到下一次 meta 读取之间的投影/续接区间；测试独占一个有界心跳 timer，finally 释放并恢复方法。**getAll 时间同时包含原生处理、克隆和调度，不能分离归因；snapshot 包含筛选与事务完成；投影区间也含 promise 续接。**探针有开销，不能与旧窗口计算提速。没有为了测量更改产品锁、缓存、容量、医学规则或存储模型。

第一次诊断 scale01 产品千条门槛通过，但探针误挂 IDBObjectStore.getAll，实际路径使用 IDBIndex.getAll，阶段输入断言失败 DIAGNOSTIC_STAGES_MISSING。归类为本轮诊断工具缺陷，原日志、原脚本和 Hash 保留；修正后另开 scale02 新完整窗口，没有取 scale01 样本补齐。见 [修复记录](../evidence/r19-audit-followup01/diagnostic-repair01.json)。

scale02 的八个阶段全部通过：

| 条数 | 冷 p95 ms | 暖 p95 ms |
|---:|---:|---:|
| 1000 | 39 | 1 |
| 3000 | 87 | 1 |
| 6000 | 171 | 1 |
| 10000 | 379 | 1 |

万条同七样本中 snapshot 为 120–171ms，getAll 派发等待为 80–126ms，投影/续接为 161–192ms；前者包含 getAll，不能重复相加。新窗口没有出现秒级异常，无法追溯性拆解独立审计失败窗口，因此性能异常仍为**未唯一归因观察**，没有证据要求现在修改产品算法。各阶段环境和原始文件见 [scale02](../evidence/r19-audit-followup01/scale02/result.json)、[分段摘要](../evidence/r19-audit-followup01/diagnostic-summary.json)。

冷≤1000ms、暖≤250ms、问诊≤250ms、备份心跳 p95≤250ms 等原门槛不变。七样本的现有 p95 算法取最大样本，未改统计口径。未主动改变系统负载，不将不同负载记录当因果证明。

## 新组合验证与交付边界

当前完整组合结果从 STATUS.json、ACCEPTANCE.json 及 evidence/r19-verification02/result.json 读取；验证进行中不得搬原57项成功声明。最终收口数据在下节追加。

不升运行产品版本，不生成或覆盖旧 R19 ZIP。SOURCE_MANIFEST 仅更新既有显式96项中的工具/计划身份；新诊断脚本属于验证工具，不新增产品运行依赖。当前工具组合与旧封存 ZIP 中的原工具快照不同，旧包不包含此次门槛修复。原包、旧凭证及外部审计输入 Hash 由 baseline.json 与最终 postcheck 复核。修复可在当前源码工程复验，不代表已发布新包或启动服务。

若下一次出现同类超限，应在失败的同一窗口读取分段与环境记录；只有定位出产品瓶颈后再提出对应修复。需要设备专项声明时，再用明确构建、独立虚构实例记录型号/OS、总内存峰值、真实低空间步骤与新进程同库读回；未测项持续标未测。

## 最终准确收口

当前 [完整结果](../evidence/r19-verification02/result.json) 为 **57 项必需检查通过、74 Node / 49 Python**，绑定204文件，digest `153035cb1dde283c8594c0cc9d4331379189e6fa3feb0974e17f2aaee5d516ee`。原57项均保留；新增图片行为用例已由同一Python实际入口运行。当前工具组合独立复审仍未进行。

使用这份实际完整成功凭证，在按204文件逐字复制的虚构临时根再次检查：未变接受；图片改一个字节/删除均拒绝STALE；恢复原字节再次接受；原工程图片从未改变。见 [真实凭证复验](../evidence/r19-audit-followup01/actual-proof-binding-reproduction.json)。这补足了仅用小型单元凭证的证明边界。

未启探针的完整规模窗口：万条状态冷/暖p95=379/1ms、问诊分页/50条=10/4ms；万条备份核对7652ms，心跳p95/max=17/291ms。既有门槛为p95≤250ms，最大值单列，不能换口径称最大值也达标。64MiB原图核对173ms、心跳p95/max=17/17ms，最大密码缓冲262145字节；浏览器总内存未量测。各值只属于各自准确窗口，不拼入诊断窗口。

完整新旧窗口各有17个故意原版/退化反例ok=false叶子；按相对路径、error、phase、failure描述逐项完全一致，新增失败0。见 [失败对账](../evidence/r19-audit-followup01/failure-reconciliation.json)。这些有效反例不是控制通过；本轮修复前2个图片子例失败及第一次诊断工具失败也全部保留，未将全部历史尝试说成全绿。

产品运行字节未变；当前96项SOURCE_MANIFEST中仅tools/verify_debt.py和tools/test_plan.json身份变化，已重新计算。旧R19 ZIP SHA256仍为 `751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d`，未重新封包、未发布。最终逐项核对见 [postcheck](../evidence/r19-audit-followup01/postcheck.json)。

现有已确认的验证工具缺陷已修；没有新增已确认产品功能缺陷。仍保留一项未归因性能观察、设备专项证据缺口、R19本人/指定Tester/临床签核边界，不能宣称全部技术风险已清零。
