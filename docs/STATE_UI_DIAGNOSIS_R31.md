# R31 state-ui 独立超时诊断记录

R31-A2R1 独立复审两次在 `browser-state-ui` 返回 `BROWSER_TIMEOUT`，因此完整独立 61 项仍未完成。本记录是 Writer 对同一未采用候选的定向诊断，不能替代独立复验。

在同一 A2R1 候选绑定 `34d6a5d267d2c55cc7d6576eb2534a94e821dbd18ea3bf5094782a3553d6aa9d` 下，使用未变更的 `tests/browser.state-ui.js`、三个全新 UUID profile，连续三次通过；`test_ui_mutation_runner` 的控制窗口通过，异步编辑变异返回预期错误。诊断01复用一个回环端口，每次均为独立 PID；截图、binding 和日志见 `evidence/r31-state-ui-diagnosis01/`。

目前能确认：候选代码不是每次必现的 state-ui 失败；独立审计的两次超时仍是有效证据，不能由作者诊断覆盖，也不能推断唯一根因。下一次独立复验必须记录前台/解锁状态、probe 源与二进制 Hash、候选绑定、profile、端口、PID，并先编译缺失的 `browser-probe`/`public-qr`。若再次超时，保留完整窗口并维持附条件；不放宽 150 秒超时、不拼接不同窗口。

补充诊断02在每次窗口都重新启动回环服务并取得不同端口（58418、58613、58803），三个新 PID/新 profile 均通过；这仍是 Writer 诊断，不是独立验收。
