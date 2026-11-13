# 文档整理与工程归档清理回执

完成：新增文档导航，归档并移除3104个历史虚构测试输出/静态测试站点副本。当前产品源码、原文档、治理及受保护证明逐文件Hash未变。服务、公网及私有状态未操作。

## 文档入口

[docs/INDEX.md](../../docs/INDEX.md)归类当前R34与独立复核、架构与使用、归档恢复及全部68份原Markdown文档。历史文件原名和内容保留，未将旧报告改写为当前验收。

## 本轮准确清理范围

限定历史r19–r31的25个verification目录中的白名单候选文件：顶层layout-/state-scale-/metrics-scale-/consult-scale-/backup-scale-/originals-64MiB输出的JSON、日志、PNG，以及phone-quota/phone-journal/phone-progress/phone-tool下bundle/site中的JS/CSS/HTML/PNG/webmanifest静态副本。实际入档3104个文件，详见[冻结计划](PLAN.json)。未凭目录命名读取私有响应或真实数据；白名单输出用途由对应浏览器测试源码及虚构场景核对。

所有result.json与node.log/python.log主结果留原位，r31-verification03全目录和r34-alias02全目录未清理。正式源、医学规则、工具、测试、固定夹具、既有封存包、采用与回退材料、四治理文件、原docs均保留。未读取/归档runtime、local-state-retained、真实账本、凭据、浏览器配置、用户原图或根目录docx；未操作Git历史。没有将早前已清理的4614项计入本轮。

## 压缩与可恢复性

3104个原文件总逻辑大小 **337752018字节（322.1MiB）**；SHA256去重为696块，归档 **6305336字节（6.0MiB）**。

归档：[archive.zip](archive.zip)。SHA256：`dff27306145e63730f9c61b7d3349995eb4226ee84fc918893b644254aa14409`。

该ZIP按内容Hash存储，不能将直接解压出的blobs当产品目录使用。通过[restore.py](restore.py)按manifest映射还原原相对路径、权限和修改时间。工具只写工程外不存在的新目录，拒绝覆盖当前工程；支持--only-path。使用方法见文档导航。

归档封闭后核对成员集合、manifest、每个唯一内容的Hash/大小；删除前再次核对每个原文件Hash、inode、设备号、mtime和权限，拒绝符号链接、硬链接及带扩展属性文件；3104项均通过。逐项移除记录见[REMOVAL.jsonl](REMOVAL.jsonl)，校验见[ARCHIVE_VERIFIED.json](ARCHIVE_VERIFIED.json)。

归档工具全量恢复3104项到独立临时目录，每项Hash和权限通过，测试副本已删除。[实际全量恢复结果](RESTORE_TEST.json)。这只验证工程历史材料恢复，不是产品数据库备份/医学业务验收。

## 空间计量

移除文件st_blocks占用344236032字节。扣除截至本报告前的新ZIP、清单、工具、恢复日志及导航等新增文件占用8048640字节，账面净减约 **320.6MiB**；后续小型回执/封存索引也占少量空间。

同一清理窗口全盘可用空间从18949214208字节到19271249920字节，变化+322035712字节（+307.1MiB）；当前约17.95GiB。该窗口实测可能包含并发磁盘活动或APFS核算，不能把全部增量唯一归因于本次操作，也不将逻辑文件净减当等额物理承诺。

## 完整性及边界

当前282项源码等输入保持绑定 `5ec9f2b0a1c84f4b1993f30af70dec212a5462827adaa3602c2e20b5687f5d21`；357个受保护文件再次核Hash一致。两份默认/历史证明保留。仅新增docs/INDEX.md及本次evidence目录，未改原源码/治理/已有文档。

首次工具在删除前因Python无os.listxattr接口停止，删除数0；原脚本及ATTEMPT01_FAILURE.json保留。修复为系统libc只读扩展属性检查后完成，没有降低保护或删旧失败记录。

本轮没有运行产品业务回归或更新任何通过声明，没有启停服务、恢复公网或收费OCR。既有R34独立附条件结论、本人/设备/性能/临床缺口保持。后续需要历史图表/布局明细时按清单恢复到新目录，不覆盖当前运行根。AIh未计量。
