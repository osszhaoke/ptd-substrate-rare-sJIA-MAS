# 用 Mac 开放定向测试：先配置保护，再连接隧道

这是你选择的方案 A。现成工具已在本机，无需购买服务器或安装软件。电脑已取消休眠，但测试期间仍需接电、联网并保持启动终端打开；Control+C 会停止本工具网关和隧道，不清除费用账本。当前文档不是已上线的证明。

测试域名使用 `https://try.ptds.ai`。仅此子域，不改主站；若控制台已有同名 DNS 或服务，请先停止这步并说明情况，不能覆盖。公开 DoH 查询时该子域为 NXDOMAIN，但这不代替执行时核对你的控制台。

1. 先创建整站邀请验证

   登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，进入 Zero Trust → Access controls → Applications，选择 Create new application，类型 Self-hosted and private（旧界面可能叫 Self-hosted）。Add public hostname 填 `try.ptds.ai`，路径留空，覆盖整个站点和 `/api/ocr`。

   登录方式选择邮箱一次性验证码（One-time PIN）。建立 Allow 策略，只加入你自己和首批受邀者的具体邮箱；不选 Everyone，不加 Bypass，也不放行整个邮箱域名。未匹配人员保持拒绝。建议先只加你自己的邮箱，验收后再加其他人；名单由你直接填控制台，不需发聊天。具体免费计划、席位和可能费用以控制台为准，遇到购买/升级提示先停，不自动订阅。

   保存应用，记下 Application Audience（AUD）及团队名供下一步 Protect with Access 配置。它们不是腾讯密钥，但也无需发聊天。

2. 创建一条专用隧道

   在 Networking → Tunnels（旧界面可能在 Networks → Connectors）新建 Cloudflared 隧道，名称例如 `ptds-invite-mac`。选 macOS；本机已有 cloudflared，**不用执行安装命令或 service install**，也不用 sudo，不自动注册常驻服务。

   控制台可能给出形如 `... tunnel run --token 一长串内容` 的命令。只保存 `--token` 后面的那一长串 Token；稍后在启动工具里隐藏输入。不要把整条命令粘贴到聊天或直接安装成系统服务，不把 Token 写进脚本。

   配置 Published application route：Subdomain=`try`，Domain=`ptds.ai`，Path留空，Service URL=`http://127.0.0.1:18793`。不要填写18791、整台机器的网段、电脑个人目录或远程桌面。

   在该路由的 Additional application settings / Access 中启用 **Protect with Access**，绑定上一步的团队和本应用 AUD，让 cloudflared 在源站前验证 Access Token；只建邮箱登录页面还不足以证明源站保护正确。HTTP 设置中启用 **Disable Chunked Encoding**（`disableChunkedEncoding: true`），网关要求带 Content-Length 的图片请求，不能用关闭网关校验来替代。

   不开启 debug 日志、请求正文/响应正文日志、会话录制、磁盘缓冲、OCR 缓存或 POST 自动重试。不要改其他站点规则。先保存邀请保护，再保存路由；此时连接器尚未启动，服务尚不可用。如果控制台必须先看到连接器才能继续，可先完成 Access，启动工具后立即补路由；只在保护配置完备后做访问验收。

3. 启动本批的专用入口

   只有在交付状态标记本版作者检查通过后，双击根目录 `START_INVITE_TEST.command`。它与旧 `START_LOCAL.command` 不同，不替换原18791预览。

   依次隐藏输入腾讯 SecretId、SecretKey、Cloudflare 隧道 Token，粘贴后各按回车。密钥只在进程内存中，隧道 Token 只给本工具启动的子进程，不写配置文件、命令参数或日志；环境变量仍对本机有相应权限的进程可见，不声称无法从操作系统层面获取。

   终端会显示本次“识别试用码”，由你私下给通过邮箱验证的测试者。重启后试用码更换，旧码失效；这只换访问凭据，不重置调用总额。腾讯密钥和隧道 Token 都不能交给测试者。云控制台显示连接器 Healthy 才说明连接状态，工具进程没退出不代表公网已验证成功。

   工具必须找到原 `~/.ptds/runtime/h5-r02/ocr-budget-v2.json`，并独占同一个 `gateway.lock`。没有账本则失败，不自动新建100次额度；上次1次预留保留，全部测试者共用剩余上限。不要同时运行旧单次OCR工具或另一套付费网关，也不要复制/删除账本。Cloudflare 隧道文件使用空的显式配置，不读取旧账号配置或证书。

4. 发邀请前，先做你自己的外网验收

   用 iPhone 关闭 Wi-Fi，走大陆蜂窝网络打开正式HTTPS地址。未登录应先出现邀请验证；未在名单的邮箱不能进入。使用已允许的本人邮箱验证码后，才能打开页面。不要据Mac同网络访问成功就说外部可达。大陆连通性/延迟可能不稳定，若不可接受就暂停邀请，另选承载方案。

   在录入页选择虚构化验单（可从页面 `/fixture.png` 另存，JPG/PNG≤2MiB），输入本次识别试用码，明确同意上传，再点击一次识别。本版会将明确同一行的文字片段或明确表头下连续的项目/结果/单位整理成候选；完整原文不改，不猜缺失值或单位，模糊项仍须人工填核。

   核对六项：铁蛋白1520 ng/mL、血小板98×10^9/L、白细胞6.2×10^9/L、C反应蛋白18 mg/L、谷草转氨酶65 U/L、甘油三酯2.30 mmol/L。血细胞单位的 `x` 乘号拼写会投影为已有支持的 `10^9/L`，数值不变、原图/原文仍保留。日期/采样时间由本人核对，不从文件名猜。识别返回不自动保存，必须核信息后在第三步本人勾选确认。

   保存后查来源，真正退出浏览器进程，再从同一浏览器读回；验证备份/恢复，再看腾讯实际用量。重开页面或换新Store不等于进程重开；清网站数据不能当重开测试。无试用码拒绝、不自动重试和总费用预留也应核对。完成后告诉我“外网可访问/候选是否完整/保存重开是否正常”，不发送密钥、Token、验证码或完整账本。

5. 再加入首批受邀者

   建议先3–5人错峰体验；这是规模建议，当前服务仍最多1个OCR并发、每分钟6次、所有人共享原100次/50元保守预留上限。先把测试者邮箱加入Allow，再私发固定HTTPS地址和识别试用码。定向发送邀请不等于访问控制已生效，必须先通过上面的拒绝测试。

   记录和原图保存在各人的浏览器，换浏览器/清网站数据会丢失，应导出加密备份；你在Mac上不能集中查看他们的病程。在线识别图片经过Cloudflare、Mac网关、腾讯，不能说图片只在本地或全程只在大陆；云平台保留策略待实际设置核查。开始先用虚构报告排查链路，不把三套规则结果当作确诊或已签核真实预警。

   停止隧道会阻断后续联网访问/识别，但已缓存页面和本地记录可能仍可离线使用，撤回Access不等于擦除测试者浏览器。你的电脑不适合承诺长期可用，持续测试再评估云主机。

技术来源：本轮读取 Cloudflare 官方文档仓库的 [Access应用](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)、[Dashboard隧道](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)、其中引用的 `secure-tunnel-with-access` 与 `add-published-application` 说明，及本机 cloudflared 2026.10.7 的 `tunnel run --help`。实际控制台菜单与计划权限仍需核对。
