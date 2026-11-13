# 转交原审计会话：R31-A2R2 state-ui 独立完整门槛复验

指定会话 `01a1bb80-c6d5-7ab3-a959-e6c281a9c5c6`，由用户转交。只读复验 R31-A2R1 未采用候选，不采用、不改产品、不联系其他 Agent。启动、交接和汇报前实际读取：`/Users/osszhaoke/Downloads/000-PTDSv0.3-StarTorchv2 - astra/docs/reference/AI_REPORTING_R02.source.txt`。

前片 R31-A2R1 独立复审报告 SHA256 `80c2f092f8a37382263758795ba4c536cfb3f87c5d1277894e53a6efe5571e46`：计划登记、三正向和三变异已通过；完整独立 61 两次在 `browser-state-ui` 超时；另有一次性 probe 未随包的 P3 准备缺口。A1 正式根仍采用，A2/A2R1 均未采用。

候选封存包：`evidence/r31-navigation02/R31-A2R1-source-and-evidence.tar.gz`，SHA256 `eec2ab4a48cdb81caa54f32be9ee21cf56e98773e0f0f738901812d04bbc25c2`，205990849 字节，9235 文件；绑定 `34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d`。解包到新的独立目录，先校验成员路径/类型/Hash；不得使用作者运行目录或旧审计展开目录。

## 本次只解决 state-ui 与完整门槛证据

1. 从候选 cwd 先编译并记录一次性工具：

```sh
mkdir -p tools/bin
swiftc tools/browser_probe.swift -o tools/bin/browser-probe
swiftc tools/public_qr.swift -o tools/bin/public-qr
shasum -a 256 tools/browser_probe.swift tools/public_qr.swift tools/bin/browser-probe tools/bin/public-qr
```

2. 确认图形会话前台、未锁屏；记录布尔状态、候选绑定、probe 源/二进制 Hash。
3. 每个 `browser-state-ui` 窗口使用新的 UUID profile、新回环服务端口和新 PID；不要复用同一 profile、服务或浏览器进程。先独立跑 state-ui，保留 binding、日志、截图和结果。
4. 若 state-ui 通过，再从同一新候选绑定、新 profile、新端口运行一整轮：

```sh
python3 -B -m tools.verify_debt --output evidence/independent-a2r2-full01
```

5. 61 个 requiredChecks 必须在同一轮全部 PASS，包含 R27 footer/unit/valid old-stage 新 PID 结果；不拼接前片、作者或 Writer 诊断窗口。若再次超时，保留超时 JSON/日志/截图和准确停止点，不延长 150 秒、不删除断言。

Writer 已有仅作诊断的三次 state-ui 通过（其中诊断02每次重启服务，端口58418/58613/58803，绑定与源码见 `evidence/r31-state-ui-diagnosis02/`），不得把它们当独立证据。独立结论必须来自本次新 profile/端口/PID。

## 结论边界

输出功能、技术债、总判定；明确 A2R1 是否仍附条件。即使完整 61 通过，也不等于 iPhone 内存、真实低空间、BFCache、本人/临床、性能唯一归因或公网验收通过。禁止采用 A2、重启服务、真实 OCR、读取真实资料/凭据或推进 A3。
