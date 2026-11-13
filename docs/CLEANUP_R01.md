> 当前工程已归拢至 `003-PTDS-FLASH-H5`；文件保留、历史恢复和当前目录以[归拢回执](CONSOLIDATION_R01.md)为准。以下旧路径及包记录保留其发生时的事实。

# H5工程清理回执

用户授权：“仅留存最新 H5 服务系列，对之前的进行清理删除”；补充：“处理一下残存多余文件，清理工程文件”。本轮唯一Writer及删除权限覆盖范围已先登记DECISIONS，不扩大到主PTDS或其他项目。

## 已完成

- Downloads中28个旧H5目录（旧产品、计划、OCR试运行、存档与恢复目录）按冻结白名单实际删除；现在仅剩 `PTDS-H5-debt-r14` 一个H5工程根。
- 最新版清理38个生成测试临时树/文件、1个Python缓存目录和已过期顶层REPORT_R02.md；保留唯一浏览器测试锁文件，避免改变后续工具锁入口。
- 保留最新版源码、工具、全部测试基准、正式成功/失败证据和Git记录；两个已封存R14交付ZIP不改字节。
- 为保留原腾讯虚构图片实测事实，只复制原OCR验收结果元数据到evidence/cleanup-r01/previous-provider-check.json，不复制旧OCR工程。
- 用途未证实的19个旧runtime子项（合计约60.25MiB）仅在文件系统内移动到local-state-retained/，未读取内容、未迁移数据库、未恢复权限。该目录权限700，已被Git忽略，运行入口不加载，也不进入当前两份封存包。它们是隔离数据状态，不是另一套服务源码。后续删除或迁移这些状态需明确数据范围。
- 主PTDS、浏览器保存的数据、外部.ptds及凭据目录未操作；没有启动或停止产品服务、发二维码、续期或调用供应商。

目录占用按du前后统计减少1315.48MiB（约1.28GiB）；不是物理可用空间承诺，文件系统克隆及缓存会影响实际可用容量。

## 验证与保留入口

最新版入口：[README](../README.md)、[交付说明](DELIVERY.md)、[当前修复报告](REPAIR_R14.md)。

原52项整版作者检查凭证evidence/r14-verification02/result.json与当前源码/测试/工具指纹仍完全匹配；本轮没有重新跑52项，也没有改变业务源码。SOURCE_MANIFEST和PUBLIC_SOURCE_MANIFEST各条Hash/bytes逐项复核通过，两份ZIP Hash与清理前一致。独立/本人/临床验收层次不变，服务端口仍无监听。

原封存源码包对应清理前的准确commit，是历史快照；新增清理记录与治理提交不在既有ZIP内，未用改写旧包伪装历史。旧路径在证据中仍是来源记录，不能再承诺存在；tests/test_phone_debt_runner.py的显式--baseline旧环境实验入口因此不再可用，常规验证门槛不依赖它。固定测试输入均在当前工程内。

精确清单与回执：evidence/cleanup-r01/{plan.json,execution.jsonl,result.json,verification.json}。删除采用路径、inode、设备号核对和不跟随软链接的精确清单，无宽泛根目录删除；执行没有错误。AIh UNMEASURED。
