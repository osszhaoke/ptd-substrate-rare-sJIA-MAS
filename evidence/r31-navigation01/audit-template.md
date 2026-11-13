# 转交原审计会话：R31-A2 隐藏问诊入口｜功能与技术债独审

指定会话`01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6`，仍由用户转交。请独立审计准确候选，结论区分功能、技术债、总判定；不采用或操作产品，不联系其他Agent。

## 已完成的前片与本片状态

你交回的R31-A1报告SHA256 `3ceffc64beb020dea93eea77fdc74096b8e9d62c8cb85ad43a0790313f432ad8`及443项证据已由Writer核同。A1已按批准串行采用：267输入`eb4367b928962e422f409df5d7e5f8d7df9aa7e585070dd0cb7ffc0425e27980`，静态`87fef183f091b968`，原PID7138及截止不变，回环/公网各94 GET字节准确。根`docs/REVIEW_CLOSEOUT_R31_A1.md`及`evidence/r31-adoption01/`可查。原“尚未采用”报告是当时快照，不要求改写你的报告。真实下限遗漏根因、O29-01和设备/临床缺口保留，未迁移独审完整61结论。

**本片A2仅为新隔离候选，未采用。** 根产品和当前默认验收proof仍是上述A1。不要把根仍267输入判为索引陈旧，也不要把候选通过当作正常用户已经看到三项导航。

## 精确候选和权限

根`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。

- 封存包：`evidence/r31-navigation01/R31-A2-source-and-evidence.tar.gz`
- SHA256：`@@ARCHIVE_SHA@@`，@@ARCHIVE_BYTES@@字节，@@MEMBERS@@唯一普通成员，解包根`candidate/`。
- 当前候选：@@INPUTS@@输入，指纹`@@BINDING@@`。
- 最终作者proof：包内`candidate/evidence/r31-navigation-verification02/result.json`。
- 清单与差量：根`evidence/r31-navigation01/freeze.json`、`frozen-inventory.json`、`candidate.diff`、`gate-summary.json`。
- 批准/地图/写集：根`DECISIONS.md`最新A2及补充登记、`evidence/r31-navigation01/plan.json`；初始计划副本与文案修正前字节另保留。

只读封存物和上述相关历史虚构证据，在自己的新编号审计目录安全解包、运行自己的虚构实例和随机回环服务。校验成员路径/类型/唯一性/Hash和准确输入后再执行，拒绝绝对路径、越界和链接。绑定自身脚本/源码/probe/PID/参数，保留原失败。禁止修改产品根、封存包、原报告、患者DOCX/截图、旧交付物；禁止读真实浏览器/数据库/令牌/.env/真实账本、发真实OCR、启停现有服务/隧道、改截止或发布。主PTDS不在本任务，不扫描或修改。现有依赖足够，不安装工具。

## 产品意图与准确改动

用户已经批准暂时隐藏问诊，把精力先放在录入、易用和个人变化比较。A2仅两产品文件：

1. `web/index.html`给原问诊导航button加`hidden`，保留DOM和绑定/原模块；原flex自动把宽度分给“状态/录入/本机”。页脚改为“帮你整理病程和检查记录 · 不代替医生”。
2. `web/features/settings.js`只删除“问诊卡请另行下载”这条隐藏后无法直接操作的指引；仍明确备份含已保存记录和原图、不含未完成录入和问诊草稿。密码/加密/备份格式不变。

不删草稿，不迁移数据，不改问诊逻辑或下载模块。普通用户的问诊入口暂不可达，**不承诺隐藏期间仍能从普通界面下载旧问诊草稿**。保留的组件可由既有测试程序化点击隐藏button验证；这不是用户可以点击隐藏入口或新的授权机制。后续可恢复入口，当前不做恢复开关界面。

源文件其余main、controller、Store、domain、医学规则、全部CSS均字节不变；无新锁/Store/网络/timer/listener/依赖，固定DOM变化O(1)。仅完整性/布局白名单与新测试工具接线变化。准确总@@DELTA@@路径，@@ADDED@@新增/@@REMOVED@@删除，@@UNCHANGED@@输入未变。

## 功能正反控制

- 新/已有本机设置下，仅三个可见主导航，顺序与文字严格为“状态、录入、本机”；问诊在触摸、视觉、键盘聚焦路径不可达。检查不是只读`.hidden`，还核实际样式、尺寸、activeElement和可见路线。
- 320/390/320@160%新脚本实际页面：各导航可点区域≥44px、标签≥14px、无横溢出；原CSS全五尺寸320/390/430/620及320@160继续跑。不能冒充iPhone实机验收。
- 实际录入/核对/明确确认/正式保存后，三页来回导航；事件/receipt/草稿状态不被导航清除，不默认最终确认。没有访问真实库或直接插正式数据。
- 页脚不再许诺问诊；本机备份说明不再让用户去不可见的问诊入口下载，仍明确草稿不在加密备份内。没有扩大备份内容或暗示草稿已被备份。
- 原consult-draft、draft-reopen等组件/真正不同PID同库读回继续通过，恢复/导出/删除/来源/参考提示和A1错误行保护不回归。观察旧脚本程序化`.click()`隐藏button是组件保留验证，不能当正常导航可达的正向证据。
- 三个有效变异需被业务断言杀死（同一未变异390场景为正控制）：去hidden→`NAVIGATION_VISIBLE_ROUTES`；恢复旧页脚→`NAVIGATION_COPY_STILL_PROMISES_CONSULTATION`；恢复失效下载指引→`NAVIGATION_HIDDEN_DOWNLOAD_PROMISE`。导入、缺文件、环境失败不能算有效变异。

可独立增加隐藏button可聚焦、布局区域或备份文字误变等反例。不要为凑缺陷要求删除保留模块或重构业务代码。

## 重点审查：样式与模板证据没有被放宽

原R06模板金样和原R09布局金样**字节不改**。原CSS级联重建测试照常执行。

`tests/template_parity.test.mjs`只添加这一处获批精确文案替换：`和问诊草稿；问诊卡请另行下载。`→`和问诊草稿。`，其余模板旧期望仍逐字比较，不把任意新输出重写成金样。

三项导航会改变底栏子树的数量/宽度，因此不能沿用四项底栏的全页Hash。新的`tests/fixtures/r31-navigation-parity.json`机械来源为**准确A1完整proof的实际五尺寸JSON**：根`evidence/r31-verification02/layout-*.json`。这些文件也在你前轮核过的A1作者归档内，SHA在新fixture中。

生成时先用原R09的approvedChangedPages/approvedAddedPages筛选并核原完整pagesSha256，保证旧捕获确实通过旧金样；逐页核最后8条style必须是四组BUTTON/SPAN，再仅去这8个导航后代和navLabels，计算其余所有38属性的Hash。原页名覆盖仍比较。

新`browser.css.js`原生捕获时只排除`nav`子树，实际可见navLabels另记录；每页严格3项、原字号/触控/溢出检查保留。`verify_debt.py`核原R09文件Hash、原pagesHash与页名绑定，再比新实际非导航内容Hash。**不是取消全页样式门槛，也不是对新结果无条件重新生成金样。** 请独立复算所有5尺寸的旧→仅剔除nav投影→新非nav内容一致，必要时构造主内容样式变异验证旧断言仍有效。

settings本来就是原R09已批准修改页，其文字改动有模板精确测试与新实际页面断言；不声称settings所有几何尺寸逐字不变。新首页/录入/草稿等原未批准区域继续精确。

## 实际作者验证与重跑说明

当前最终完整@@CHECKS@@项、@@NODE@@Node、@@PYTHON@@Python通过；mandatory `home-resources`确实调用新navigation runner，新增3个尺寸正向/3个有效变异。原@@OLD_FAILURES@@个预期失败按id/类型/消息/除随机profile外配置一致，新增3个共@@CURRENT_FAILURES@@，所有原始失败保留。

第一轮完整61在仅HTML隐藏版本下通过；随后源码审阅发现仍有失效下载指引，补充明确写集后只修一处settings文字与测试。修前字节/初始计划/原窗口都保留，第二轮是**新组合**重新完整取窗，不拼接第一轮PASS。首轮指纹`76a8347947c540dab9de8ddbe63721db5afd2fe2ba1073d44ede894511b8b407`不是最终候选，不得拿首轮Hash验本包新源码。参见`copy-supplement-receipt.json`、`repair-before/`、`verification-window*.json`及两个driver日志。

准备期一次新runner从根cwd执行导致module missing，只在明确候选cwd重跑；原输出在对话，未生成日志，`preparation-errors.json`如实登记，不冒充产品失败或编造日志。初始四项导航对新意图的反例在独立回环服务得到`NAVIGATION_VISIBLE_ROUTES`，不是把旧版已批准四项功能倒称代码缺陷。

双树267→@@INPUTS@@→267精确正逆、缺新测试实际被`require_verification`拒绝；当前根A1指纹不变，未操作现有服务、无真实OCR。新模块/锁/后端没有发生，结构扫描不能写为全工程技术债清零。

## 可执行入口（在审计副本）

先确认Mac图形console前台且未锁屏，只取必要布尔/负载，保留开始/结束快照；环境不符停受影响GUI测量，新编号取完整窗口，不拼样本。使用既有Node/Python/Swift/WebKit，无广泛测试发现。

```sh
node --test tests/template_parity.test.mjs tests/frontend_structure.test.mjs
python3 -B -m tests.test_navigation_runner --output evidence/independent-nav01
python3 -B -m tests.test_home_resources_runner --output evidence/independent-home01
python3 -B -m tools.verify_debt --output evidence/independent-full01
```

cwd必须你解包的`candidate/`。若只定向跑，明确未独立完整61；不能复制作者计数代替独立执行。完整集合仍是原61，mandatory新增行为在原home-resources内，白名单有browser.navigation.js；不写根默认验收proof。

## 结论与停止点

输出功能/技术债/总判定，区分代码缺陷、证据缺口、后续能力。每个问题需严重度、准确源Hash/行号、虚构复现、期望/实际、业务断言及最小修复建议，列实际运行与未覆盖内容。报告和证据放你新编号目录，产品/服务/作者封存物前后Hash不变。

保留真实下限来源链未定位、O29-01完整20k兼容约1.5秒/1000ms实验、独立完整61、iPhone峰值内存/真实低空间/BFCache、本人/临床、网关内存准确加载与历史性能归因缺口。指标身份、图片适配、紧凑核对、趋势、基线、病程比较仍未实施。本片隐藏不等于比较功能交付。

结束后由用户把报告带回Writer；不修正式产品、不采用、不重启、不自动推进下一片。
