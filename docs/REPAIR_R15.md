# R15｜问诊草稿保存竞态修复

用户直接授权“继续修技术债”。唯一Writer、准确基线和冻结写集见DECISIONS及evidence/r15-start/source.json。本批继续在003-PTDS-FLASH-H5内原地实施，不复制第二工程，不启动产品服务/公网，不接触隔离状态、真实资料、凭据、真实费用账本或主PTDS。无新依赖，AIh UNMEASURED。

## 原错与影响

同一个草稿保存任务没有把异步结果、外部冲突和残留debounce的优先关系保持到结束：

1. 保存尚未返回时继续编辑会留下待保存timer；当前保存因quota失败后，timer仍能再次调用写入，形成没有显式操作的重试。
2. 原保存已提交但结果还在返回时，其他页面的新草稿可以先提交并触发冲突；旧成功回来却把本页改为saved/unsaved=false。页面显示“已保存”，数据库实际保留另一页的新文字，本页手工补充失去未保存提示。
3. 外部冲突成立后，迟到的其他写入错误把conflict改成error，使界面不再要求先重载新版本。

原Node三例实际失败，既有七例通过，完整原输出在evidence/r15-start/original-node.log。真实IDB原行为捕获original-capture.json不是修复PASS；original-regression.json被SAVED_AFTER_COMPETING_DRAFT实际断言抓住。两次真实CAS事务先后提交，真实本页Store通知在旧结果返回前送达；不是伪造数据库内容、直接插库或文字推断。

## 最小实现与边界

业务源码只改web/app/consultation_draft.js。保留已有合并编辑和debounce节奏，在失败边界清理timer；成功循环、旧成功回执和最终返回均尊重已经出现的conflict。迟到失败保留已有conflict，不覆盖成可重试的普通error；disposed后的旧失败不再发状态。

不撤销已经提交的事务，也不把数据库里的对方内容改成当前页文字。当前页内容仍在内存可编辑/复制/下载，但冲突时拒绝继续保存；只有用户明确选择载入最新草稿，等待旧active完成并重新读取后，才按既有CAS继续。显式重载和其后正常保存有未变异对照。原quota错误不吞掉，不自动重写或换请求ID。

调用图：用户编辑→一个草稿owner、一个pending值/至多一个timer→原Store CAS事务；外部通知/reset→conflict→旧结果不得越过屏障；显式reload→原一致读取→新一轮保存。没有新锁、队列、字段、存储引擎、网络或后台任务。选中上限50与文本上限保持，数据增长10倍仍为常数状态检查，临床数据读取和加密路径不变。规则/字典/DB2/wire/密码格式容量/OCR/费用保护模块逐项核对。

## 证明方法

- fixed-node01、fixed-browser01是针对性修复对照，不冒充整版验收。
- tests/fixtures/r15-original-consultation-draft.js及r15-draft-baseline.json固定原版准确commit/Hash，属于验证fingerprint；正式测试不热读旧目录或evidence。
- 隔离变异有正常控制，以及恢复原版、去掉失败timer撤销、去掉成功冲突检查、去掉失败冲突保护四组。Node检查分别抓住具体业务断言；原版/成功屏障变异另由真实IDB抓住错误saved状态。不是前置拒绝，产品未被改成变异版；预期结果的临时树清理，served Hash及完整日志保留。
- 新真实IDB用例与变异runner都登记白名单；完整门槛由52增至54，Node64/Python46。准确完整窗口以STATUS/ACCEPTANCE和当前result为准，不搬旧PASS。

产品/手机工具/公开壳标识按冻结清单更新r15，只做同版接线。完整验证期间冻结源码、测试、工具和计划，不拼采样窗口。最终只留当前一个产品包；源码与历史证据以Git恢复，不再产生重复源码ZIP。旧版本证据工作副本按Git索引归档，失败原件和既有结论保留。

R12本人手机阶段通过仍保留为本人声明；新R15只按实际作者检查登记。独立/本人/临床验收不自动通过，手机物理内存峰值、真实空间耗尽与旧首次卡顿原因没有新证据仍是观察项。本片属于P2草稿可靠性问题修复，不声称技术债清零。

## R15最终完整检查

准确evidence/r15-verification01/result.json的54项全部通过（64 Node/46 Python），binding 01e06e546d626055fc1c8bf3fd3638be61e1f9576e894166fa8bd129cfe3fd2d。新竞态实际IDB、原错/修复对照及四组有效退化均通过；原失败未撤销。24项保护源码逐项相同，业务修改仅ConsultationDraft；其他运行文件只是r15版本接线，完整差量与包回执供复核。

本Mac虚构场景：万条三卡冷p95=319ms/暖1ms，问诊分页8ms/选50条生成3ms；万条备份核对6826ms、心跳p95=17ms/max234ms。独立profile核对6818ms、23次文件读取、0次metadata Blob.text、1MiB最大物理读窗、心跳p95=17ms/max242ms。64MiB原图通过，最大密码缓冲262145字节、心跳p95=19ms。不同PID同profile、刷新、五尺寸/160%、离线冷启动、回退、取消/quota原子回滚与旧通知隔离全部在当前窗口通过，不声称异环境提速倍数。

源码完成、候选接入、作者运行验证完成；本人/独立/临床不代签。此前本人手机阶段声明保留，R15新代码不自动继承；物理内存峰值/真实空间耗尽和历史首次卡顿原因无新证据仍观察。只保留当前根与一个r15产品ZIP，旧版本证据工作副本按evidence/r15-archive-plan.json归入原Git提交，源码ZIP不重复生成；最终执行/包Hash以r15-package-final.json为准。服务保持暂停，无实际供应商调用，AIh UNMEASURED。

### 本批归档与清理实际完成
原R14的524个证据工作文件已按r15-archive-plan.json归入原Git提交5301267885ed4ecd460318eb59de9f7388fa459c，原件与失败结论仍可准确恢复。新R15原错/修复/退化/完整凭证保留当前工作目录。15个本批生成测试临时树及Python缓存已清理；未知runtime保留项为0，不操作隔离状态。旧R14产品ZIP在新R15完整凭证和预包逐文件通过后删除，当前仅deploy/PTDS-H5-sjia-mas-r15.zip；没有重复源码ZIP或第二工程根。清理后当前完整fingerprint仍匹配，最终包重建及逐文件/权限/确定性核验详见r15-package-final.json。服务保持暂停，本片收口后停止开发。

### 交付核对环境差异
末次预包检查的包字节、权限、清单、保护模块、版本接线和完整验证绑定均已通过，随后“全机无cloudflared”的额外假定失败。实际仅核对进程身份：PID21175、/opt/homebrew/bin/cloudflared、cwd=/private/tmp/hs-public.Es8Fkj/site，为本工程外进程，本会话未启动；未读其参数、令牌或项目内容，未终止或修改该进程。本工程18788/18791/18795无监听，服务仍暂停。该全机假定记录为false，不改写为通过；修复和54项作者验证不受影响。原失败记录evidence/r15-package-check-attempt01.json；最终交付按本工程范围复核，保留外部环境差异。
