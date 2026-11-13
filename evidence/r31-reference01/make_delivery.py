from pathlib import Path
import hashlib,json,re
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;C=R/'runtime/r31-reference-candidate01';g=json.loads((O/'gate-summary.json').read_text());f=json.loads((O/'freeze.json').read_text());w=json.loads((O/'verification-windows.json').read_text());assert g['ok']and f['ok']and w['ok'];assert f['binding']==g['binding']
replacements={'ARCHIVE_SHA':f['sha256'],'ARCHIVE_BYTES':f['bytes'],'MEMBERS':f['fileCount'],'BINDING':g['binding'],'INPUTS':g['boundInputs'],'DELTA':len(g['delta']),'ADDED':g['added'],'REMOVED':g['removed'],'UNCHANGED':g['unchangedInputs'],'CHECKS':g['checks'],'NODE':g['nodeTests'],'PYTHON':g['pythonTests'],'WINDOWS':g['reportWindows'],'POSITIVE':g['reportPositiveWindows'],'EXPECTED':g['reportExpectedFailures'],'OLD_FAILURES':g['expectedFailuresOld'],'CURRENT_FAILURES':g['expectedFailuresCurrent']}
audit=(O/'audit-template.md').read_text()
for key,value in replacements.items():audit=audit.replace('@@'+key+'@@',str(value))
assert '@@'not in audit
(R/'docs/AUDIT_R31_A1.md').write_text(audit)
receipt=(O/'delivery_template.md').read_text().replace('作者验证完成后待指定外部独审','作者验证完成，待指定外部独审').replace('此文件为交付说明草稿，准确计数、指纹、归档及校验以最终报告为准。','准确计数、指纹、归档及校验如下。')
receipt+='''
## 准确版本和交付

'''
receipt+=f"- 基线：R30，263输入；正式产品指纹`14a437750d0b84b00c266dff2888684b6f70a930b4c52d52ccfcc82943690649`未变。\n- 候选：`{g['binding']}`，{g['boundInputs']}输入；{len(g['delta'])}路径差量，{g['added']}新增/{g['removed']}删除，{g['unchangedInputs']}输入未变。\n- 冻结包：`evidence/r31-reference01/{f['archive']}`，{f['bytes']:,}字节，SHA256`{f['sha256']}`，{f['fileCount']}个成员逐Hash解包校验。\n- 完整准确清单：`evidence/r31-reference01/frozen-inventory.json`；差量`candidate.diff`。\n- 完整自测：包内`candidate/evidence/r31-verification02/result.json`，原{g['checks']}项、{g['nodeTests']}Node、{g['pythonTests']}Python通过。原{g['expectedFailuresOld']}个有效预期失败逐例同态；本片3个新增有效业务变异，共{g['expectedFailuresCurrent']}个，仍保留全部失败日志。\n- 报告核对相关{g['reportWindows']}窗口，{g['reportPositiveWindows']}正向、{g['reportExpectedFailures']}预期失败；新参考范围保存/加密备份/新PID读回、3变异均在原mandatory门槛内实际执行。\n- 双树零模糊正逆回放，完整逐路径、数量、Hash与缺失项核查；两树移除新模块均实际被require_verification以VERIFICATION_STALE_OR_MISSING_FILES拒绝，恢复后再逆回放。\n- 独立审计提示词：[AUDIT_R31_A1.md](AUDIT_R31_A1.md)。审计方结论尚未收到；默认验收索引仍为已采用R30，不提前把候选写为产品通过。\n"
receipt+='''
## 验证窗口与准备记录

第一轮完整61通过，但未单独留存开始前GUI快照。保留原结果，不作为唯一环境合格窗口；在确认on-console=true、screenLocked=false后以全新profile重新跑完整第二轮，结束后同样检查环境。第一/二轮准确产品输入一致，样本不拼接；包内两个窗口及根`verification-windows.json`/环境快照可查。此过程没有归因手机/历史性能。第一轮不是业务失败，不删原始结果。

原baseline02用虚构字面明确捕获REFERENCE_QUALITY_MISSING；它是展示行为失败，不是真实照片端到端首次保存复现。准备期Node负数参数/错误cwd和过早读取日志等均在`preparation-errors.json`登记，有原日志的指向原日志，只有对话工具输出的明确说明没有文件，不补造执行记录。

## 模块与技术债复核

纯只读模块`reference.js`，核对/详情`report_rows.js`，撤销勾选/清理`report_editor.js`。原parser/origin/wire/restore/save/Store/医学规则不改。长数值在进入有界decimal前检查，不把范围解析异常传到整页；不增加锁、网络、后台任务、缓存、Store或依赖。100行×200字符，测试10倍投影；原大文件不增长，原main未改。有限结构扫描见`debt-scan.json`。作者在本片未发现未修可复现问题，独立技术债审计仍待；不能宣称全工程清零。

治理新增报告/冻结证据，不改旧交付物、独审报告、旧ZIP、患者DOCX、截图或正式数据；原公网进程未操作。AIh未计量，不虚构耗费/余额。当前停止点：冻结候选，等待指定外部审计回执；首片采用和后续片均未启动。
'''
(R/'docs/DELIVERY_R31_A1.md').write_text(receipt)
with (R/'DECISIONS.md').open('a')as out:
 out.write(f"\n### R31-A1作者验证完成、封存待指定独审（未采用）\n参考范围只读质量提示隔离候选{g['boundInputs']}输入/{g['binding']}，{len(g['delta'])}路径（{g['added']}新增，无删除），原61/{g['nodeTests']}Node/{g['pythonTests']}Python完整通过。首轮缺独立GUI前快照保留，第二轮前后确认解锁on-console并重取完整窗口；无拼样本。原{g['expectedFailuresOld']}个预期失败逐例同态，新增3有效业务变异共{g['expectedFailuresCurrent']}；报告{g['reportWindows']}窗口/{g['reportPositiveWindows']}正向/{g['reportExpectedFailures']}预期失败。双树准确正逆及缺新模块实际拒绝通过；root263输入R30不变，采用/公网操作/实时OCR0。新归档SHA{f['sha256']}，入口docs/DELIVERY_R31_A1.md及docs/AUDIT_R31_A1.md。用户转交01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6独审，作者未联系或代签；未收到独审，状态AUTHOR_VERIFIED_PENDING_EXTERNAL_AUDIT_NOT_ADOPTED。真实截图漏下限根因未知，未修解析器/未补值；隐藏问诊和A其余片尚未实施，原性能/实机/临床等缺口继续保留，AIh未计量。\n")
print(json.dumps({'ok':True,'audit':'docs/AUDIT_R31_A1.md','delivery':'docs/DELIVERY_R31_A1.md','status':g['status']}))
