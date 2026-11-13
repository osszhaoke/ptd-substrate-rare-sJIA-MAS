from pathlib import Path
import copy,datetime,hashlib,json,sys
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent;sys.path.insert(0,str(R))
from tools.acceptance_index import expected_index,refresh_index,validate_index
adopt=json.loads((O/'adoption-result.json').read_text());manifest=json.loads((O/'manifest-validation.json').read_text());review=json.loads((O/'review-registration.json').read_text());http=json.loads((O/'http-after.json').read_text());assert all(x['ok']for x in [adopt,manifest,review,http]);expected=expected_index(R,R/'evidence/r31-verification02/result.json');assert expected['verificationBinding']==review['binding']==adopt['binding']
patch={'id':adopt['staticPatch'],'batch':'R31-A1','staticVersion':adopt['staticVersion'],'status':'EXACT_SOURCE_AND_STATIC_ADOPTED_AFTER_TARGETED_INDEPENDENT_CONDITIONAL_PASS; NOT_FULL_INDEPENDENT61_OR_HUMAN_CLINICAL','verification':expected['currentProof'],'binding':adopt['binding'],'boundInputs':adopt['boundInputs'],'report':'docs/REVIEW_CLOSEOUT_R31_A1.md','adoption':'evidence/r31-adoption01/adoption-result.json','gatewayVersionUnchanged':'h5-sjia-mas-r19'}
review_record={k:copy.deepcopy(review[k])for k in ['report','reportSha256','binding','scope','independentExecution','retained']};review_record.update(status='TARGETED_CONDITIONAL_PASS_EXACT_CANDIDATE_ADOPTED_BY_WRITER',registration='evidence/r31-adoption01/review-registration.json',adoption=patch['adoption'],fullIndependent61=False,realLowerBoundLoss='UNKNOWN_SOURCE_CHAIN; NO_GUESSED_REPAIR',humanOrClinicalAcceptance=False)
public={'snapshotAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceBinding':adopt['binding'],'staticVersion':adopt['staticVersion'],'sourceStaticAdopted':True,'exactGETAssetsPerOrigin':http['assetCountPerOrigin'],'listenerPID':7138,'serviceRestarts':0,'url':http['origins'][1]['origin'],'expiresAt':http['deadlineUnchanged'],'deadlineChanged':False,'gatewayChanged':False,'gatewayLoadedIdentity':'not reverified; GET/health not runtime OCR proof','evidence':'evidence/r31-adoption01/http-after.json','phoneHumanClinicalAcceptance':'PENDING'}
for name in ['STATUS.json','ACCEPTANCE.json']:
 p=R/name;d=json.loads(p.read_text());d['priorStaticPatchR30']=copy.deepcopy(d['staticPatch']);d['staticPatch']=copy.deepcopy(patch);d['independentReviewR31A1']=copy.deepcopy(review_record);d['currentPublicStatic']=copy.deepcopy(public);d['verificationEvidence']=expected['currentProof'];d['verificationBinding']=adopt['binding'];d['productTreeSha256']=manifest['productTreeSha256'];d['independentTester']='R31_A1_TARGETED_CONDITIONAL_PASS; NOT_FULL61_OR_HUMAN_CLINICAL'
 d['debtSummary'].update(knownReproducibleLocalCodeItemsOpen=0,independentFindingsAwaitingClosure=0,scope='R31-A1 reference quality only: no new reproduced defects in independent scope; true missing lower bound unknown; O29-01 and device/clinical gaps retained',verificationToolInputBinding='CURRENT_267_INPUTS_EXACT',runtimeAdoption='R31-A1 exact source/static adopted; loopback/public GET matched; gateway unchanged, no restart; no paid calls',report='docs/REVIEW_CLOSEOUT_R31_A1.md',evidence='evidence/r31-adoption01/review-registration.json',humanIndependentClinicalAcceptance='R31-A1 targeted conditional pass only; human/device/clinical pending')
 d['independentEngineeringAudit']['latestR31A1Report']=review['report'];d['independentEngineeringAudit']['currentStaticPatch']='R31_A1_TARGETED_CONDITIONAL_PASS_EXACT_ADOPTED; NOT_FULL61_OR_HUMAN_CLINICAL'
 d['packageSnapshot'].update(currentRuntimeBytes='R31_A1_EXACT_SOURCE_STATIC_ADOPTED; OLD_R19_ZIP_UNCHANGED',currentToolCombination=expected['author']+'; R31_A1_INDEPENDENT_TARGETED_CONDITIONAL_PASS_ONLY')
 if name=='STATUS.json':d.update(productAdoption='R31_A1_EXACT_SOURCE_AND_STATIC_ADOPTED_AFTER_INDEPENDENT_TARGETED_CONDITIONAL_PASS',authorVerification=expected['author']+'; O29_01_PERFORMANCE_OBSERVATION_RETAINED',publicDeployment='EXISTING_PARTNER_SESSION_R31_A1_STATIC_GET_EXACT; ORIGINAL_DEADLINE_UNCHANGED',oldService='PID7138/PPID1 on18795 unchanged; no restart or gateway change; deadline unchanged',physicalPhone='R31_A1_PENDING; MEMORY_QUOTA_NOT_TESTED',humanAcceptance='R31_A1_PENDING')
 else:
  d.update(phone='R31_A1_PENDING; MEMORY_QUOTA_NOT_TESTED',human='R31_A1_PENDING',publicTrial='EXISTING_SESSION_R31_A1_EXACT_STATIC_GET; NO_NEW_PROVIDER_OR_PHONE_CLINICAL_ACCEPTANCE');d=refresh_index(d,expected);validate_index(d,expected)
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=R/'AUTHORIZATION.json';d=json.loads(p.read_text());d['priorScopeBeforeR31A1']=d['scope'];d.update(scope='approved A, sole003 Writer; exact R31-A1 adoption after supplied independent audit; subsequent slices isolated and independently audited before adoption',userDecision='A，要求每一步都有审计；沿用用户转交指定外部审计会话；已交回R31-A1报告',humanAcceptance='R31_A1_PENDING');d['r31Workflow']={'externalAuditorSession':'01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6','auditTransport':'USER_TRANSFER_ONLY; NO_AGENT_CONTACT','currentAdopted':copy.deepcopy(patch),'independentReview':copy.deepcopy(review_record),'nextSlice':'hide consultation entry only; preserve drafts/storage/module; isolate implementation, full author gate then external audit','noCredentialBudgetRealDataOrServiceRestart':True};p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(O/'acceptance-index-validation.json').write_text(json.dumps({'ok':True,'derivedCurrentIndex':expected,'exactCurrentProofUsed':True,'actualNodePythonLogsUsed':True,'allDefaultAliasesChecked':True,'sourceManifestEntries':manifest['entryCount'],'priorDefaultsPreserved':True,'independentFull61':False,'phoneHumanClinicalNotPromoted':True},indent=2)+'\n')
report=f'''# R31-A1 独立定向收口与Writer采用回执

当前状态：独立定向附条件通过，Writer已准确采用。本报告登记后续事实，不改原封存交付说明及独审报告。原“候选尚未采用”的报告是当时准确快照。

## 独审证据与裁决

报告：{review['report']}，SHA256 `{review['reportSha256']}`。独审索引443个交付文件逐大小/Hash核同；作者封存包和267输入逐Hash一致。独立实际134 Node、55 Python、68报告窗口（53正向/15有效预期失败）、增强3组6个正向/1个详情变异，并检查35明确分类和10,000有界字符串。未独立完整61，不扩为本人、实机或临床签收。独审未发现新增P0–P3缺陷，不为凑数重构。

未知参考信息在核对、保存、恢复和真正退出后不同PID同库读回仍提示；修改撤销本行核对，勾选不提升质量。保留原字面、来源和可选范围未知仍可保存有效结果的边界。真实漏下限来源链仍未知，未定位/补字；不能说整表OCR无漏项。

## 准确采用

- 指纹 `{adopt['binding']}`，267输入，静态 `{adopt['staticVersion']}`，标识 `{adopt['staticPatch']}`。
- 13路径（4新增、0删除）；254输入不变。源与测试/生成字节均来自已独审封存候选，无现场语义改动。
- 当前完整作者proof：`{expected['currentProof']}`，61项/134 Node/55 Python；它是准确同字节候选原始执行的采用副本，不声称采用后又跑一轮61。
- 独审前已有双树正逆；本轮采用再做准确正逆与全集Hash核同，一次原子web交换，保留旧web及非web准确回退字节。采用后require_verification接受当前267集合。
- 来源索引132项及5拒绝控制通过；默认验收索引由实际proof/log机械导出，保留旧默认摘要，避免只新增块却留下陈旧默认。
- 回环及既有公网各{http['assetCountPerOrigin']}资源GET字节准确，含新模块、启动图、SW；PID7138不变，重启0、实时OCR0、秘密/真实账本/患者库读取0。GET不是浏览器完整业务或网关内存同版OCR证明。
- 原网址与北京时间2026-11-12 23:59截止不变，不重置额度或迁移origin；已打开页面何时采用取决于原有缓存/SW生命周期，不强制刷新使用中的页面。
- 原R19 ZIP、R31-A1封存包、独审文件及旧证据不改；来源manifest索引的是当前树，不重写封存物。

## 后续与保留边界

O29-01完整20k兼容约1.5秒/aggregate1000ms实验未达标继续保留；独立完整61、iPhone内存/真实低空间/BFCache、本人/临床、网关加载身份及历史性能唯一归因未补。不能写全工程技术债清零。

A1收口后，下一片只隐藏问诊入口并同步三项导航/相关文字，不删草稿或模块、不扩展趋势；先冻结地图/锁/写集、隔离实现、完整自测，再由用户转交原审计会话。下一片在独审前不采用。AIh未计量。

证据入口：`evidence/r31-adoption01/review-registration.json`、`adoption-result.json`、`manifest-validation.json`、`http-after.json`、`acceptance-index-validation.json`。
'''
(R/'docs/REVIEW_CLOSEOUT_R31_A1.md').write_text(report)
with(R/'DECISIONS.md').open('a')as f:f.write(f'\n### R31-A1独审定向收口与准确采用完成\n指定独审报告及443索引文件核同；实际134Node/55Python/68报告窗口、增强6正向1详情变异，未独立完整61、无新增缺陷，按本片定向附条件通过登记。准确13路径/4新增/无删除、267输入{adopt["binding"]}、静态{adopt["staticVersion"]}已采用；正逆回放、一次web原子交换、132来源索引/5拒绝控制和默认验收proof/计数机械刷新通过。原61/134/55为同字节候选原始proof采用副本，不冒称采用后新跑。回环与原公网各{http["assetCountPerOrigin"]}GET资源准确、PID7138/原截止不变；网关/密钥/预算/真实库不动、重启及实时OCR0。原封存包、独审和旧证据不改。真实漏下限未定位，O29-01/真机/低空间/BFCache/本人/临床/独立完整61等缺口保留。入口docs/REVIEW_CLOSEOUT_R31_A1.md；A1收口后可冻结A2隐藏问诊候选，独审前不得采用。AIh未计量。\n')
print(json.dumps({'ok':True,'currentIndex':expected,'reviewStatus':review_record['status']}))
