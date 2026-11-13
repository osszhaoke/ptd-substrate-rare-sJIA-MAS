# 工程归拢与释放空间回执

用户指定的唯一当前工程根：`/Users/osszhaoke/Downloads/003-PTDS-FLASH-H5`。本轮由本会话唯一Writer按用户“释放空间……剩余有效工程文件都归拢到downloads的文件夹下：003-PTDS-FLASH-H5”执行，开工清单和写集已先记DECISIONS。

## 当前结果

- 原PTDS-H5-debt-r14整体同盘重命名为当前根，不留副本或旧路径软链接；Downloads中没有剩余PTDS-H5-*旧根。
- 当前产品仍是R14；web/gateway/public_trial、工具、测试、固定夹具、规则与数据协议字节不变。常规启动脚本从自身位置定位工程，不依赖旧目录。
- 从工作目录移除1641个旧轮次及首轮重复验证证据文件，完整原件仍在Git提交16e8924f7a8dc69963bb99e24897c9992d082887。每项路径、字节数、SHA256和Git blob见evidence/consolidate-r01/plan.json；当前最终52项、R14原错/失败/有效变异、R12本人阶段声明及清理回执留在工作目录。没有删改失败结论。
- 重复源码ZIP（83,956,959字节）从工作目录移除。删除前流式重建git archive并核对SHA256逐字一致；完整源码/测试/历史证据仍在Git中，不再额外保存第二份大压缩包。一个现有R14产品ZIP保留原封存字节，内含文档反映当时状态，当前目录入口以README为准。
- 清理迁移验证生成的Python缓存及.DS_Store；保留必要二进制工具、唯一测试锁、固定测试输入及Git历史。
- local-state-retained内19个旧状态项约60.25MiB，仅随根目录移动；权限和Git忽略保持，内容未读、未删、程序不自动加载。它们不能在缺少用途证据时冒充可删缓存。本轮没有读取或擦除浏览器资料、真实数据库或外部.ptds/凭据，没有操作主PTDS。

目录du占用本轮再减少约184.23MiB，当前约106.95MiB（收口文档/Git提交可能带来小幅增加）。这是目录占用统计，不等于文件系统实际可用空间增量；上轮删除28个旧根的1.28GiB结果另记docs/CLEANUP_R01.md，未重复计算。

## 新位置验证

- 61项Node、46项Python明确白名单检查在新根重新执行，全部通过；日志位于evidence/consolidate-r01/{node.log,python.log}。
- 三个.command启动脚本分别zsh -n通过，不执行启动行为。
- 原52项整版作者验证凭证仍与当前根无关指纹4106d6c0ff2b8407a50aa22c435f0bc1b4724a29b45accb90f1e482e17703a85完全一致；本轮没有重跑整套52项，不将旧证据改写为新执行。
- 两个产品文件清单的路径/Hash/bytes逐项通过；邀请入口的只读产品校验通过；当前产品ZIP SHA256仍为89556076c60d23e6b263dc6c7b0071b77349ef98fefc02f7a64f1e36df10405e。
- Git fsck --full通过，历史对象完整；源码ZIP可由commit8126e828cf6137b9fae529f166ceff66f04d936d准确恢复，预期SHA256为98829cf629d0d0ec3567d45c60c5daed1daad5b8d4e6d363992aff7a1878b192。
- 18791/18795无监听；没有恢复产品服务、隧道、二维码或调用真实供应商。单元测试仅使用临时虚构资源。

未测的手机物理峰值/真实低空间、独立/本人/临床验收层次保持原记录，不因目录整理改为通过。AIh UNMEASURED。

## 需要历史材料时

先查看上述plan.json中的归档清单，再按单个路径恢复；例如在当前根运行：

```sh
git restore --source=16e8924f7a8dc69963bb99e24897c9992d082887 -- evidence/具体历史文件
```

需要原源码交付包时才生成，不在日常重复占用空间：

```sh
git archive --format=zip --output=deploy/PTDS-H5-sjia-mas-r14-source.zip 8126e828cf6137b9fae529f166ceff66f04d936d
```

这只恢复代码/证据，不恢复用户权限或对隔离状态自动迁库。旧测试的显式--baseline历史实验仍不属于常规验证入口，不承诺已删除旧环境还能执行。
