from pathlib import Path
import hashlib,json,re,sys
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-navigation-candidate01'
summary=json.loads((O/'gate-summary.json').read_text());frozen=json.loads((O/'freeze.json').read_text());plan=json.loads((O/'plan.json').read_text());assert frozen['adopted']is False and frozen['binding']==summary['binding']
values={'ARCHIVE_SHA':frozen['sha256'],'ARCHIVE_BYTES':frozen['bytes'],'MEMBERS':frozen['fileCount'],'INPUTS':summary['boundInputs'],'BINDING':summary['binding'],'DELTA':len(summary['delta']),'ADDED':summary['added'],'REMOVED':summary['removed'],'UNCHANGED':summary['unchangedInputs'],'CHECKS':summary['checks'],'NODE':summary['nodeTests'],'PYTHON':summary['pythonTests'],'OLD_FAILURES':summary['expectedFailuresOld'],'CURRENT_FAILURES':summary['expectedFailuresCurrent']}
audit=(O/'audit-template.md').read_text()
for key,value in values.items():audit=audit.replace('@@'+key+'@@',str(value))
assert '@@'not in audit
p=R/'docs/AUDIT_R31_A2.md';assert not p.exists();p.write_text(audit)
static=json.loads((C/'deploy/STATIC_MANIFEST.json').read_text())['staticVersion']
delivery=f'''# R31-A2：暂时隐藏问诊入口｜隔离候选交付

当前状态：作者完整验证完成，待用户转交指定独审；**未采用，当前正式树和公网仍是A1**。A1已按交回独审定向附条件通过准确采用，见[前片收口](REVIEW_CLOSEOUT_R31_A1.md)；本文件不改写旧报告当时“尚未采用”的事实。

## 用户体验与范围

本片把底部可见入口收为“状态、录入、本机”，暂时隐藏问诊；页脚改为“帮你整理病程和检查记录 · 不代替医生”。本机页面删除无法从普通入口执行的“问诊卡请另行下载”指引，仍明确加密备份不含未完成录入和问诊草稿。仅两个产品文件：`web/index.html`和`web/features/settings.js`；SW和静态清单按原工具重建。

保留原问诊DOM、模块、草稿和下载实现，不迁移或删除数据，备份格式不变。普通用户在隐藏期间不能从正常界面进入问诊或下载旧草稿；不以保留模块暗示仍有用户入口。已有组件测试可程序化点击隐藏button，属于组件保留回归，不是正常用户可达证据。后续可恢复入口，本片没有设置开关。

main、controller、Store、domain、医学规则与全部CSS原字节不变；无新增锁、网络、计时器、监听、缓存或依赖。固定DOM与文案开销O(1)，原规模与性能检查保留。指标身份、图片适配、紧凑核对、趋势、稳定期基线和病程比较仍未实施，不把本片写作整个方案A完成。

## 准确版本、封存和作者验证

- 正式基线：267输入，`{plan['baseline']['digest']}`；默认proof仍`evidence/r31-verification02/result.json`，未提前更新为A2。
- 最终候选：{summary['boundInputs']}输入，`{summary['binding']}`，静态版本`{static}`；{len(summary['delta'])}路径差量，{summary['added']}新增/0删除，{summary['unchangedInputs']}输入未变。
- 归档：`evidence/r31-navigation01/{frozen['archive']}`，{frozen['bytes']:,}字节，SHA256`{frozen['sha256']}`；{frozen['fileCount']}成员逐Hash回读核同，清单`frozen-inventory.json`，补丁`candidate.diff`。
- 最终包内proof：`candidate/evidence/r31-navigation-verification02/result.json`，完整{summary['checks']}项、{summary['nodeTests']}Node、{summary['pythonTests']}Python通过。mandatory home-resources已实际调用新增导航验证，三尺寸正向、三个有效页面行为变异。作者自动化只使用虚构数据，不冒充本人确认或实机签收。
- 原{summary['expectedFailuresOld']}个预期失败按id、异常类型、消息及除随机profile外配置逐例一致，新增去hidden/旧页脚/失效下载指引三个有效变异，共{summary['expectedFailuresCurrent']}个，保留失败原日志。不是43个未修产品缺陷。
- 双树267→270→267准确正逆、逐路径Hash/数量/缺失核查通过；实际删除新增测试会被require_verification拒绝，再恢复原字节。正式基线、A1封存包、用户DOCX保持原Hash。

原R06/R09金样未改。新布局投影先核准确A1五尺寸捕获符合原R09完整Hash，再仅剔除四项底栏后代与navLabels；其余38属性和页名仍精确比较。新原生采集明确三可见入口、字号≥14px、触控≥44px、无横溢出。settings原本是获批变化页，额外用模板精确文字替换与实际页面断言约束，不声称该页几何逐字不变。审计提示词要求独立复算此窄范围投影。

## 两次完整窗口与准备失败

第一轮仅HTML隐藏组合完整通过，指纹`76a8347947c540dab9de8ddbe63721db5afd2fe2ba1073d44ede894511b8b407`。随后审阅发现本机仍有失效下载指引，先登记补充写集、保留原计划与七个修改前文件，再修关联文案和测试。最终组合以全新窗口重跑完整61，前后均onConsole=true、screenLocked=false；两轮不拼样本，第一轮不作最终组合通过证据。包内保留两个完整窗口、两个定向窗口，根保留环境和driver日志、补充回执。

准备期一次从正式根而非候选cwd运行新runner导致module missing；原输出仅在工具对话，未生成日志，`preparation-errors.json`如实说明。初始四项导航对新批准意图的行为反例在隔离回环服务被捕获，不倒称此前四项设计原本是缺陷。

## 审计、债务边界与停止点

独审入口：[AUDIT_R31_A2.md](AUDIT_R31_A2.md)，由用户转交原会话`01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6`；作者未联系或代签。独审需区分功能、技术债和总判定。当前仅作者有限范围复核未发现新增未修可复现项，不能宣称全工程技术债清零。

保留真实下限遗漏来源链未定位、O29-01完整20k兼容约1.5秒/1000ms实验未达标、iPhone峰值内存/真实低空间/BFCache、本人/临床、独立完整61及历史网关加载身份等缺口。没有新增真实OCR、读取密钥/真实账本/患者库、操作服务或变更截止。AIh未计量。

本片封存停止，等待独立回执后再准确采用；不推进下一片。治理中pendingCandidate只表示待审候选，顶层默认proof与已采用身份仍是A1。
'''
p=R/'docs/DELIVERY_R31_A2.md';assert not p.exists();p.write_text(delivery)
pending={'batch':'R31-A2','status':'AUTHOR_VERIFIED_PENDING_EXTERNAL_AUDIT_NOT_ADOPTED','binding':summary['binding'],'boundInputs':summary['boundInputs'],'staticVersion':static,'checks':summary['checks'],'nodeTests':summary['nodeTests'],'pythonTests':summary['pythonTests'],'productWriteSet':plan['productWriteSet'],'deltaPaths':len(summary['delta']),'added':summary['added'],'removed':summary['removed'],'unchangedInputs':summary['unchangedInputs'],'proofInArchive':'candidate/evidence/r31-navigation-verification02/result.json','archive':'evidence/r31-navigation01/'+frozen['archive'],'archiveSha256':frozen['sha256'],'archiveBytes':frozen['bytes'],'auditPrompt':'docs/AUDIT_R31_A2.md','delivery':'docs/DELIVERY_R31_A2.md','externalAuditorSession':plan['externalAuditorSession'],'auditTransport':'USER_TRANSFER_ONLY_NO_AGENT_CONTACT','independentAudit':'PENDING','adopted':False,'normalUserConsultationAvailableInCandidate':False,'draftStorageAndModulesPreserved':True,'ordinaryDraftDownloadPromised':False,'serviceOperationsOrPaidCallsThisSlice':0,'AIh':'UNMEASURED'}
for name in ['STATUS.json','ACCEPTANCE.json','AUTHORIZATION.json']:
 p=R/name;data=json.loads(p.read_text());assert 'pendingCandidate'not in data
 if name!='AUTHORIZATION.json':assert data['verificationBinding']==plan['baseline']['digest']
 data['pendingCandidate']=pending
 if name=='AUTHORIZATION.json':data['r31Workflow']['nextSlice']='R31-A2 candidate frozen, wait for user-transferred external audit before adoption or subsequent slice'
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
with (R/'DECISIONS.md').open('a')as f:f.write(f'''\n### R31-A2最终候选完整验证、封存待指定独审（未采用）
最终两产品文件index.html/settings.js，270输入{summary['binding']}，静态{static}，14路径/3新增/无删除/256输入未变。完整61/134Node/55Python通过，3导航正向/3有效业务变异，原40预期失败逐id/类型/消息/除随机profile外配置相同，共43。仅HTML首轮与关联文案修正后最终完整窗口分别保留，最终前后console未锁屏，不拼样本；原R06/R09金样不改、仅导航投影、正文样式门槛保留。双树267→270→267准确正逆与实际缺新测试拒绝通过；封存{frozen['bytes']}字节/SHA{frozen['sha256']}，{frozen['fileCount']}成员逐Hash核同。普通问诊入口暂不可达、无失效下载指引；草稿/模块/格式不删不改，组件程序化隐藏button测试不冒充正常可达。正式根仍准确A1/267输入及默认proof；治理只增pendingCandidate，未采用A2、未操作服务/真实OCR/凭据/账本/真实库。真实下限根因、O29-01、实机/低空间/BFCache/本人/临床/独立完整61等缺口保留；其余A片未实施。用户转交原独审会话，入口docs/AUDIT_R31_A2.md及docs/DELIVERY_R31_A2.md；未联系独审，等待回执，不推进下一片。AIh未计量。\n''')
print(json.dumps({'ok':True,'pendingCandidate':pending},ensure_ascii=False))
