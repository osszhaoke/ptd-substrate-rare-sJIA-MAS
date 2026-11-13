# R16｜当前技术债修复与完整复扫

用户授权“静默执行至修复所有技术债”；唯一Writer与冻结写集见DECISIONS。所有操作在003-PTDS-FLASH-H5内，不改主PTDS，不读local-state-retained、真实资料/凭据/费用账本，不启产品服务/公网，不安装依赖或启动其他Agent。AIh UNMEASURED。

## 原错、实现与证据

业务差量只有web/app/{consultation_draft,consultation_flow,ui}.js。旧Store、医学规则/字典/DB2/wire/备份格式容量/费用政策不变，53个保护运行文件逐项核对见evidence/r16-protected.json。main产品源码未改。

| 发现 | 原版有效证据 | 修复及验收断言 |
|---|---|---|
| 旧问诊生成覆盖等待期间新手改 | r16-original02/original-flow/consult-edit.json | 发布同时核查草稿identity/version，最新手改逐字保留 |
| 旧生成覆盖冲突页本地文字 | original-flow/consult-conflict.json | conflict阻断发布；真实对方CAS仍在库，本页文字保留，不重写 |
| 初始load忽略草稿通知 | original-draft/node.log | loadEpoch；通知发生在快照后就只读重取，不把旧值标saved |
| 初始load忽略临床更新 | r16-controls01/original-draft/node.log | 临床通知也使读失效；已有手动文字保留并标stale |
| 连续改动没有有界拒绝 | original-draft/node.log | 至多三次只读，之后DRAFT_CHANGED_TRY_AGAIN，旧冲突文字仍在 |
| reload失败逃出UI | original-flow/reload-error.json | 当前页错误提示，无unhandledrejection；保留本页文字，显式重载恢复 |
| 放弃旧投影后仍“正在整理” | r16-status-regression01/control/consult-edit.json | finally结束处理提示，conflict按钮禁用；旧输入保护断言保留 |
| 已有OCR导航回归没有进入完整门槛 | test_plan与原verify_debt入口差量 | 新必需async-ownership内执行已有ocr-navigation及编辑/迟到hash对照 |

初步怀疑OCR覆盖手改被原版实测否定：main.invalidate本来就取消OcrTask，原OCR-edit/hash两项均PASS。r16-original01由runner错误地期待失败而停止，原输出/纠正记录保留，不算产品缺陷，也不宣称本轮修了OCR。隔离移除原取消后，新输入值断言真实失败，证明已有保护有回归约束。

load只重取只读快照，不重试保存/权限/收费请求。正常CAS、显式retry/reload、原debounce/容量保持。临床内容与revision仍在同一Store只读事务读取；外部通知只是使旧结果失效，不拼两个时点。所有异步归属检查是常数开销，无新增全局锁、缓存、后台任务或存储引擎。

## 验证与失败记录

- r16-original02：真实UI三项原错和Node原错；原OCR正确对照保留。
- r16-controls01：修复对照及恢复原Flow/Draft、移除原OCR取消均被实际行为断言抓住；未用准备检查冒充。原版夹具在tests/fixtures/r16-ownership-baseline.json逐项绑定基线commit/Hash并纳入fingerprint。
- r16-verification01：当时准确55项通过（67 Node/46 Python），binding d8404804b9ce9ef10f51c547aaa60f9936816ffc4aae248a0695605c05b9a974。其后新增终态检查，旧凭证不再用于当前打包。
- r16-status-regression01：实际抓住处理提示未结束；修复后controls02因测试等待条件仍要求冲突按钮启用而失败，原日志和工具修复记录照留。等待条件改为处理终态，具体输入/提示/按钮/持久数据断言一项不删。
- r16-controls03：准确当前修复对照和退化全部通过，随后另开r16-verification02完整窗口，不拼01样本。

当前最终准确结果从STATUS/ACCEPTANCE及evidence/r16-verification02/result.json进入，只有成功且字节binding仍匹配才打包。包含原54项与新async-ownership，覆盖万条/64MiB、五尺寸/160%、离线、回退、实际页面刷新和不同PID同profile、取消/quota全回滚。

## 复扫范围和剩余边界

精确复扫台账evidence/r16-debt-scan.json。扫描当前H5的UI/任务生命周期、Store/来源关系/草稿CAS/state快照、备份读写/取消、OCR适配与server/预算/凭据路径、构建/白名单/当前文档。源码扫描和作者虚构测试不等于完整安全审计、本人/独立/临床验收。

本轮登记的可本地复现代码问题已实施修复，是否整版通过以准确最终窗口为准。手机总内存峰值和真实物理低空间未测；R12用户阶段PASS原话保持，不搬给新代码。R10首次卡顿没有足够当时探针，保留历史异常，不能靠新版本消除历史证据缺口。临床核验/独立验收、原图区域显示/置信度校准及公网托管分别是外部验收或新能力，不以技术债名义代签或扩功能。

首页双入口只完成用户已批准的静态效果图，等待图片审批；未接入当前产品，不能把预览冒充已实现。后续按用户要求独立模块、无新增全局锁、不扩前端大文件，并在实际合入后再次扫描债务。

产品/包/提交/清理最终身份见evidence/r16-package-final.json；当前仅一个工程根和一个当前产品包，源码/旧失败证据以Git恢复，不再生成重复源码ZIP。

## 最终准确窗口结果

最终r16-verification02的55项全部通过，67 Node/46 Python，binding 78655ac95d2f094b0c7dcc28baef5536f2a65f2cb56f8b28f83487df63539d2f。源码/测试/工具/计划保持同版，完整55项包含原54项及async-ownership。当前登记可复现本地代码待修项为0，手机物理证据/独立临床等缺口保持上述边界。
