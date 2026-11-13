> 当前工程已归拢至 `003-PTDS-FLASH-H5`；文件保留、历史恢复和当前目录以[归拢回执](CONSOLIDATION_R01.md)为准。以下旧路径及包记录保留其发生时的事实。

# R14修复｜关闭后不接收迟到的打开或读取结果

直接依据用户“批准并进行下一步修复”，沿用“不公网试用”。唯一Writer与冻结写集见DECISIONS。只写PTDS-H5-debt-r14，R13/R12/旧公开根/主PTDS与旧档只读。没有产品服务/隧道/二维码、真实供应商请求或真实资料/密钥/真实费用账本读取；无新增依赖，AIh UNMEASURED。

## 原错证据

- evidence/r14-start/original-store.json是原版行为捕获，不是修复PASS：close后open仍fulfilled且connectionResurrected=true；queuedWrite persisted=true；blocked已reject后测试库从v1升v2并新增meta；正常已开始事务完成的控制组仍成功。
- original-store-regression.json在实际IDB行为后由CLOSED_STORE_RESURRECTED断言失败，非前置拒绝。
- original-reader.log：既有四例通过，两例关闭后读/迟到窗口拒绝检查Missing expected rejection；原缓存确会被关闭后的结果回填。
- fixed-store01与fixed-reader01保留初次修复对照。补迟到blocked状态用例后late-state-regression01发现关闭后仍有1次状态通知，随后按同一owner/代次补齐，不删除断言。
- success-close-regression01属于无效测试时序。补success-close-instrumentation01证明wrapped=1而fired=0（open结果返回时关闭钩子尚未运行），没有证据证明提前close。保留工具实验，不认作产品缺陷，不为此改产品；该无效实验从最终用例移除。其余有效原错检查全部保留。

## 修复的边界

Store每次opening只有一个当前owner及关闭代次；并发正常open仍共用同一请求。close推进代次、结算旧等待者并释放当前连接/通知频道，不排队或自动重试。IDBOpenDBRequest不能直接取消，因此其upgradeneeded先核对abandoned/代次，过期就abort原升级事务；迟到success只关闭该旧连接。finally只有仍拥有pending的调用能清opening/频道，不清新owner。blocked和versionchange不向已关闭或非当前owner发迟到状态。

所有tx在await open之后、创建新事务之前再核对代次与connection；过期请求报STORE_CLOSED，不偷偷恢复工作。不修改正式确认、不重放或换请求ID。已经开始的事务依旧按原commit/abort结算，close不是撤回已开始保存。本批只在自有UUID测试库构造阻塞和版本变化，没有迁移或读取任何真实库。

BackupReader从OPEN到CLOSED不可逆。新读先拒绝closed；等待物理读回后先检查closed/cancel，再发布窗口；close清空窗口，迟到读不推进position也不填回bytes。原1MiB读窗、单帧AES、格式/密码/完整性/容量保护不改。

新增检查是常数开销，没有新增锁、队列、timer、网络、后台任务或存储引擎；Store不在事务内await长工作。10倍数据仍走原stage-confirm-save，原1千→1万与64MiB、冷/暖/备份心跳门槛保留，不放宽。R13派生通知异常隔离保持准确字节。

## 变异与完整检查

lifecycle-mutations01/02在临时树独立执行：恢复原Store、删除废弃升级abort、恢复原reader三组退化，分别被CLOSED_STORE_RESURRECTED、ABANDONED_UPGRADE_CHANGED_SCHEMA和关闭读拒绝行为断言抓住；未变异对照通过，不以preflight拒绝算杀死，产品没有被改成mutant。

首轮r14-verification01在当时准确字节52项全部通过（Node61/Python46）。收口时发现变异原版样本虽固定Hash却位于不参与fingerprint的evidence目录，已将准确原件及来源清单复制到tests/fixtures，runner仅使用该受绑定输入。01原结果保留；02按最终字节重新完整验证，不拼窗口，最终凭证见STATUS/ACCEPTANCE。

当前完整显式门槛52项，Node61/Python46；包含原通知故障与有效变异、录入/核对/确认/事务保存、来源/原图、同profile不同PID读回、问诊、取消/回滚、离线服务器退出后冷启动、升级回退、五尺寸/160%、旧模板/样式、1千→3千→6千→1万和64MiB原件。当前准确窗口以STATUS/ACCEPTANCE及新result为准，不搬旧PASS。正式验证期间冻结产品/测试/工具字节，不拼不同窗口。

R12本人手机阶段通过仍是历史事实；R14新代码只按实际作者检查登记，不代签独立/本人/临床。手机物理峰值、真实空间耗尽和旧R10首次卡顿原因没有新测量，保留观察；不能把它们改成通过。

## 交付与停止

产品包deploy/PTDS-H5-sjia-mas-r14.zip，源码/测试/证据包deploy/PTDS-H5-sjia-mas-r14-source.zip；准确树与包Hash、确定性二次构建/逐文件核对、旧根保护及源码commit记evidence/r14-package-final.json。新根独立存档，不覆盖R13。源码ZIP按指定commit封存；随后生成的最终包核对回执以单独提交保存，故不在其已封存源码ZIP内，这是避免归档包含自身Hash的循环，不是遗漏。完成本片后停止，服务继续暂停，不请求公网选择。

## R14最终准确窗口与停止点

最终凭证为evidence/r14-verification02/result.json：52项全部PASS（61 Node/46 Python），binding 4106d6c0ff2b8407a50aa22c435f0bc1b4724a29b45accb90f1e482e17703a85。固定变异输入位于tests/fixtures并全部纳入该binding；01当时通过保留，不用来打包。新增三组退化均由实际行为断言捕获，未变异对照通过；无效success-hook时序试验不计产品失败，原日志与其他实际失败均保留。

本Mac虚构数据：万条三卡冷p95=294ms、暖1ms；问诊分页9ms、选50条生成4ms；万条备份核对7166ms、心跳p95=17ms/max227ms。独立profile核对7165ms、23次物理文件读、0次metadata Blob.text、1MiB最大读窗、心跳p95=17ms/max240ms。64MiB原图通过，maxCryptoBytes=262145、心跳p95=20ms。不同PID同profile与页面刷新、五尺寸/160%字体、离线冷启动、升级回退、原通知/配额/取消/回滚均在同一窗口通过；不计算异环境提速比例。

源码完成、候选接入、作者运行验证完成；独立/本人/临床不代签。R12本人手机阶段声明保持，未提供的总内存峰值/真实物理低空间及R10首次异常原因继续保留为观察。R13原1395 tracked文件/HEAD及27项保护模块重核不变，证据r14-protected-recheck02.json；本批产品语义差量仅Store与BackupReader生命周期，其余为版本与测试接线。服务保持暂停、真实供应商调用0、AIh UNMEASURED。归档核对完成后本轮停止，无后台开发或自动下一片。
