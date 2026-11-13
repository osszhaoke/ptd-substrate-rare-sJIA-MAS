# 工程归档与空间清理 R26

本批八个候选目录已先压缩、逐项校验后删除工作副本；原测试图片、现服务入口、原封存ZIP、根目录历史证据和其他审计方目录未删除或改写。当前产品仍为R26准确239输入，未重启服务或恢复公网。

- 原候选：40,213文件，逻辑大小1,652,197,408字节。
- 去重后：6,190唯一内容块，归档55,785,819字节（约55.8MB）。
- 逻辑净节省：扣除去重包约1.60GB；另加当前源码包约2.42MB。
- 本轮窗口文件系统可用空间增加约1.71GB；此值是时间窗口实测，可能包含其他磁盘活动，不当作逐文件物理占用的唯一归因。
- 所有路径/大小/权限和内容Hash逐项一致；实际恢复JS、JSON、PNG三类样本通过后移除仅本批抽检目录。

旧候选以内容寻址ZIP保存，同一字节只存一份，通过manifest还原各路径与权限、修改时间。该包不是普通解压后可直接运行的产品包：先用恢复工具还原到新目录。第一版tar与不带权限的当前源码中间包仅在替代包完整验证后删除；原报告和验证记录保留，没有改写任何本轮之前的封存ZIP。

## 当前归档

| 用途 | 路径（相对003根） | SHA256 |
| --- | --- | --- |
| 八个候选完整可恢复归档 | `runtime/archives-r26-01/engineering-candidates-content-addressed.zip` | `47eab5a26472515db3f08b5e23d05db7797520d5dc79a0b5e8b7ff888e2f3e4c` |
| 当前源码、测试和选定公开证据（含文件权限） | `runtime/archives-r26-01/PTDS-H5-R26-current-source-with-modes.zip` | `c71a10cb1530918b4d5b0b7e3ffe406cdd6988788399de01f4badf26a56d2ffc` |

当前源码包冻结于产品提交7922c53；后续只有交付文档与验收边界文字更新，不改该包或其已冻结产品输入。两个包均位于0700私有目录，文件0600。当前源码包排除患者图片/响应、个人库、密钥和运行状态；旧候选档案也按私有工程档案保管，不应直接对外发布。

保留当前`web`、最新完整proof、来源清单、`runtime/local-ocr-r23-01`本机OCR入口、当前采用的前字节与旧web、`runtime/r26-image-check01`私有测试证据。新`runtime/r26-candidate01`的工作副本已入档，相关旧路径不是运行入口；复核直接用当前根及其proof，若需隔离候选则从归档恢复。

## 恢复方法

在003根先查看归档：

```sh
python3 -B evidence/r26-cleanup01/restore.py
```

恢复到**不存在的新目录**，不能覆盖运行根：

```sh
python3 -B evidence/r26-cleanup01/restore.py --destination /Users/osszhaoke/Downloads/003-PTDS-FLASH-H5/runtime/restored-r26-01
```

工具先核对归档SHA，再逐文件验Hash和大小、还原权限；支持`--only-path`恢复指定归档路径。原候选根会出现在新目录下的runtime对应子目录。不自动恢复产品、启动服务、恢复公网或重放确认权限。

证据：`evidence/r26-cleanup01/plan.json`、`archive-verified.json`、`deduplicated-verified.json`、`final-result.json`、`restore-smoke.json`和`current-source-archive.json`。首版工具的完整清单仍留作历史。Git首次提交因缺作者配置失败，后用本仓既有Codex身份进行单次命令提交，未修改全局或仓库身份设置。
