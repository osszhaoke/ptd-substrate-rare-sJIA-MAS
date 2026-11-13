# R13修复｜正式结果不由界面通知决定

本批直接执行用户“不公网试用，直接修复”。唯一Writer和写集见DECISIONS；只改独立H5新副本，R12/R11/公开旧根/R10/主PTDS及旧交付只读。没有产品服务、隧道、公网或新二维码，真实资料/密钥/真实费用账本均未读，供应商调用0，无新增依赖，AIh未计量。

## 根因与改动

原Store在IDB transaction complete后调用changed，再resolve；回调或postMessage抛错发生在事件栈，事务已落库但调用Promise不返回。原接收端监听也被第一个坏回调阻断，原blocked状态通知抛错可阻断open拒绝。原BackupTask finally通知可覆盖work成功/失败；ConsultationDraft emit和ActionCoordinator onError同样可把已保存草稿报失败或让被拒重复操作抛异常。

新增web/shared/observe.js作为唯一无I/O派生通知边界：捕获同步异常与返回Promise的拒绝，只在owner累加饱和整数observerFailures，不保存错误对象、输入、日志或堆栈。Store先按真实complete结算，再隔离本页订阅/远端广播/状态回调；监听使用当前订阅快照，新增监听下次通知生效。BackupTask仅finally结束显示隔离，保留启动/进度/提交前的原失败语义；草稿emit和协调器错误提示统一使用同一边界。业务fn/work和事务fn不进入该隔离层，真实失败不能改成成功。

没有新锁、事务、后台任务、网络、timer或存储引擎；不自动重发/重试或恢复授权。原确认、原子提交、取消边界、数据版本/医学规则/字典/wire/容量/备份密码和费用策略不变。原本支持的typed通知/本页与跨页失效保持；只是通知异常不再拥有持久化结果。普通成功路径增加常数函数调用，订阅分发仍O(订阅数)，10倍数据路径按完整门槛重验。

## 原错与修复证据

- evidence/r13-start/original-store.json：原行为捕获，不是候选PASS。本页与广播故障均events=1且save pending；本页/远端健康监听0次、blocked open pending。
- original-store-regression.json：原真实WebKit行为断言LOCAL_COMMITTED_SAVE_HUNG失败，正式内容已存在后才触发失败；不是前置校验拒绝。
- original-backup-task.log：两例实际失败，分别结束显示覆盖已完成提交/原QuotaExceededError；原五例保持通过。
- original-other-observers.log：已保存草稿flush被saved显示异常覆盖；操作错误/忙提示异常破坏返回边界，三个新增行为用例失败，既有九例通过。
- fixed-store01/02、fixed-backup-task01/02及fixed-all-observers01保留递进对照；当前完整门槛还加入异步监听拒绝、versionchange关闭、blocked真实拒绝和真实配额异常无部分保存。
- evidence/r13-observer-mutations01：独立临时树取消共用边界，Node行为失败及实际IDB健康监听断言LOCAL_LISTENER_STARVED失败；原对照均通过。产品字节未被变异，附全部served-bytes，不把前置失败算杀死。

扫描条件为web中onChange/onError/onState/listeners/postMessage。所有派生通知点已纳入统一边界；BackupTask操作前/处理中控制回调保留原语义，OcrTask.valid/current为有效性判断而非派生观察者，不能捕获后当有效。手机工具自身DOM更新不是产品提交回调，本批保留原字节；其Store新增shared依赖已明确收集进静态工具包。

## 当前验证与验收范围

新增store通知浏览器检查与observer-mutations，完整显式白名单50项；Node增加6项为59，Python46项。准确当前结果将在本轮完整窗口完成后登记；不搬旧48项作为新PASS。原失败、取消/回滚、离线退出/升级回退、同profile不同PID读回、五尺寸/160%、模板/样式和1千→1万/64MiB规模门槛全部保留，不放宽断言。

R12本人手机阶段验收通过仍作为历史明确事实；R13当前新改动只登记实际作者检查，独立/本人/临床另记。物理手机内存峰值和真实空间耗尽仍无新增测量；历史R10首次卡顿仍不唯一归因，不把证据缺口改成PASS。无待执行的公网动作或上线选择。

## 交付

最终产品包deploy/PTDS-H5-sjia-mas-r13.zip及源码/测试/证据包deploy/PTDS-H5-sjia-mas-r13-source.zip；准确字节、旧根保护、确定性二次构建和最终Git归档身份记evidence/r13-package-final.json。候选源码完成/接入、作者运行验证与本人/独立验收分别列。完成本轮后停止，服务保持暂停。

## 最终准确同版验证

当前证据evidence/r13-verification01/result.json，binding ebc61696a08404175a9a2f4954fd5859c50f1c864d5ae1bcebfcf2e4d4c3b662。本轮新完整50项全部PASS，59 Node/46 Python，源码/候选接入/作者运行检查完成；不是独立或本人对新代码验收。没有新失败窗口被覆盖；原行为捕获、原回归失败、针对性对照、独立变异与本轮完整窗口均保留。

| 当前作者Mac虚构窗口 | 结果 |
|---|---|
| 万条状态 | 冷p95=833ms、暖1ms，原1000/250ms门槛通过 |
| 万条问诊 | 分页p95=9ms、50条选中/生成3ms |
| 万条备份 | 核对7445ms、提交737ms；心跳p95=17ms/max=234ms |
| 万条备份profile | 物理读取23次、最大读窗1048576字节、metadata Blob.text=0；全部--enforce门槛通过 |
| 64MiB原图 | 逐字核对通过，单帧262145字节，心跳p95=17ms |
| 通知故障 | 本页/远端坏监听不阻断健康监听，广播抛错不挂save，异步拒绝无未处理事件，blocked正确拒绝，versionchange关闭原连接 |
| 真实事务失败 | 注入quota仍拒绝且没有落下部分记录；不是catch后报成功 |

只比较本窗口是否达既有门槛，不将不同负载/时点的数值差异宣称固定提速。24项保护模块准确不变、旧R12的946个tracked/HEAD保持，见evidence/r13-protected-final.json。代码差量web仅Store、备份任务、草稿、协调器、纯observe模块和生成SW；网关/部署/构建仅同版接线；测试和手机包shared依赖接线明确。

当前本片已复现问题全部修复，未登记其他可复现待修代码项；物理手机测量与旧卡顿历史原因作为观察保留，不包装成已通过。不再请求公网选择或启动服务。
