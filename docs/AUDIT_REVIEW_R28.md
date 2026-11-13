# R28 独立定向复审提示词

请将下方全文交给原独立审计AI。工程结果和本人测试入口见[修复报告](REPAIR_R28.md)。当前为作者修复完成待复审；不能凭本提示词关闭独立问题。

---

你是独立审计方。请复审R27报告中的R27-A01/P2（左右表格页脚漏项）、R27-A02/P2（跨入口残缺单位可保存），同时检查最小修复是否引入回归或新技术债。给出每项关闭／保留及证据，再给功能、技术债和总判定。未经实际运行不扩大声明，不自动修复、合入、恢复公网或替本人/临床签收。

## 权限与当前事实入口

唯一产品根`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。只读产品、治理、旧证据、旧ZIP和原独立报告；输出到你新建的独立审计目录。先读STATUS.json、ACCEPTANCE.json、AUTHORIZATION.json、SOURCE_MANIFEST.json、DECISIONS.md最新R28登记，然后读docs/REPAIR_R28.md。

原独立报告：`/Users/osszhaoke/Downloads/PTDS-Flash-R27-independent-audit-20261111-01/REPORT.md`。它绑定R27、独立119 Node/54 Python、22报告浏览器窗口及2个新边界实验；没有独立重跑全部61、没有读取第三批患者原图/私有响应。请保留它的原边界和失败证据，不把R28作者通过当独立关闭。

不读密钥、试用码、.env、Terminal、进程环境、真实预算账本、正式病程库或个人浏览器配置；本轮全部复验用公开虚构夹具，无需读取第三批健康资料。不得产生真实OCR调用、重试index200或重置预算。不要启停/热重载产品服务、安装依赖、启动其他Agent、发邀请或改Writer。

允许在自己的新目录建立准确白名单副本、虚构UUID浏览器实例、随机本机端口和假供应商。不要在产品根运行会改shell/SW的构建或verify_debt。复制范围按完整proof的绑定输入，加所需治理/清单/已存在工具二进制，不能复制产品私有runtime。需要旧字节时从准确Git版本或审计已封存副本取得并逐Hash确认。

## 准确交付身份

- 产品提交：`c3c42603f260be80112362bb66a0721f54393a46`；后续文档提交不改变240产品/测试输入。
- 静态修复：`r19-layout03`；静态版本：`bd2d50eab43d0cf2`。
- 240输入fingerprint：`7fda886d7f62b63c86f55df901371862fc03beb88198c6af3890f282b3ecafee`。
- 作者完整结果：61项检查、124 Node、54 Python；31报告正向窗口、9个有效浏览器变异；15组新PID同库读回；另2个service直接行为变异及未变异对照。
- R27→R28：14路径，无新增/删除；226绑定输入未变；113来源索引。


旧R19 ZIP保持`751072d01e65ba17f3f4141f4bb77206b45d182aaabefdcca8731d9af0fe8e4d`，不含R28。准确采用/正逆回放与来源索引见evidence/r28-adoption01；完整作者proof见evidence/r28-verification01/result.json；修复/原失败/行为反例见evidence/r28-repair01。

## R27-A01 关闭标准

1. 从原layoutLedger构造左短右长：只把左footer上移85px。应5项、右侧3项，不得再4项/右侧2项；镜像右短左长同样5项。90/180/270坐标及普通左右/上下双表正控制保留。
2. 检查reportDataBoxes的窗口是否按同一空间列组确定footer和下方表头；跨整表的footer与相邻无效表头不得错误借列或放过footer后项目。不能简单忽略footer、扩大窗口或把被截断内容当零问题。
3. 新增同根因反例：双语CBC左表footer后追加一个可被旧医学回退识别的CRP999。应仍27项、无999。reportRows的独立行和legacy candidates回退不能把空间过滤已排除的source IDs重新加入。没有改医学字典/规则或candidates源码。
4. 原ledger、行序/重复、原文字面、坐标、原图/来源Hash不可变；只对候选视图过滤。旧CBC/旋转/上下页/来源框/保存恢复不回归。
5. 移除同列组footer约束应由实际候选数量业务断言捕获，非语法/预检失败。作者mandatory runner的footer-cross-panel反例及未变异对照可重跑。

## R27-A02 关闭标准

1. 五类入口分别验证：旧双语表、通用表、无坐标平面表、有坐标单行cells、独立inline。残缺mg/或等价末尾斜杠不能只勾选后完成保存。通用表可以留空结果待补；其他可靠识别的原值可保留，但应显示待补单位并阻止暂存。
2. reportUnitNeedsReview是否同一纯谓词供coverage、UI、stage、save使用？检查完整性调用覆盖，不应只补通用table grammar。确认旧暂存记录在新save入口也不能绕过。直接调用新stage/save应被拒且零stage/commit；不得只依赖页面隐藏按钮。
3. 仅清空残缺单位不能规避，明确无量纲项目或定性结果例外须可解释。禁止猜分母、根据文件名推单位、扩大医学映射，或一律拒绝完整陌生单位。unknownUnit、FEU/DDU、计数拼写、定性与明确比值正控制保留。
4. 用户真正改单位后撤销旧勾选，重新核对再保存，原识别结果/origin不改；保存、详情、加密备份恢复和不同PID同库读回保全。不可直接插库或预设正式确认冒充用户验收。
5. 新写入保护放在stage/save，历史schema/backup字面许可不应静默收紧；检查旧已确认事件/备份的读取兼容，不通过改旧schema或重写旧origin规避。
6. 移除共享单位谓词的浏览器反例应触发REPORT_INCOMPLETE_UNIT_STAGED；单独移除service.stage或save保护，Node业务断言应因“Missing expected rejection”失败，未变异正控制应通过。不是缺文件/编译拒绝。

## 建议实跑（仅隔离副本，串行，新输出目录）

```sh
node --test tests/report_rows.test.mjs tests/report_contract.test.mjs
python3 -B -m tests.test_report_rows_runner --output evidence/independent-r28-report01
```

现有mandatory report-rows-wire保留原正控制和7个变异，追加8个版式/入口闭环和2个业务变异；检查真实binding/PID，不只看result.ok。附加两条直接stage/save变异方法在evidence/r28-repair01/stage_save_mutations.py，执行前把ROOT和candidate路径改为你自己的准确副本与新输出位置，禁止原路径写入。它们是作者补充验证工具，不能替代你对断言和输入的独立检查。

可按风险在同一隔离副本重跑完整白名单：

```sh
python3 -B -m tools.verify_debt --output evidence/independent-r28-full01
```

该命令会写候选shell/SW/manifests；先绑定原输入，生成后必须仍与冻结身份一致。不要unittest discovery，不跑主PTDS大规模用例或新增依赖。完整61若没实跑请如实写未独立全套重跑。原32个预期失败按id/错误值/类型及配置逐例对账；本批新增两个预期变异分开。保留准备期失败与修后新编号，不说所有尝试全绿。

## 回归、采用与债务边界

5个产品文件实际语义修改：report/tables.js、table_fields.js、rows.js，features/report_rows.js、domain/service.js；测试和构建生成同批。核对准确差量集合、before/after、无新增/删除、正逆回放、113项来源索引与五个旧/缺输入证明拒绝控制。不因行数短就认定无债务。

检查无新增全局锁、Store、网络、计时器、队列、依赖；原100行/20k片段和2k/20k<1000ms、万条记录/64MiB备份等门槛不放宽。Node测量不代表iPhone总内存，也不得用一个窗口断言性能始终达标。

本轮未改gateway；不启停持密钥进程，不新增真实provider调用。新静态GET只能证明资源提供准确，不能证明旧进程加载了先前R27 JPEG网关。旧服务内存版本以新session/PID/加载字节为证，不从磁盘源码或health通用版本推断。

278离线/媒体、15腾讯有效响应/1不确定/4未试、128项/5待补等均为R27历史作者材料，本轮未重跑私有数据，不算R28新增独立识别能力。index200确切异常和实际费用仍未知，不可自动重试或推断唯一根因。

iPhone峰值内存、真实低空间、BFCache/后台、本人/临床、历史性能唯一归因继续待证。两项独立问题只有你实际定向复审后才能独立关闭，作者标记“已修待复审”不是独立通过。输出新报告、问题关闭表、复验命令/环境/PID/输入工具Hash、失败及结果索引；不改当前治理或发布。正式回执按R02一张五字段卡，附一条报告链接。
