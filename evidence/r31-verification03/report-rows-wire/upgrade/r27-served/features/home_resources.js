// Static patient resources only. Never receives or projects stored health data.
export const KNOWLEDGE_QR='/assets/sjia-knowledge-qr.jpg';
export const HANDBOOK_URL='https://www.kdocs.cn/l/cgZMyp7rdz4g';
export function homeResources(){
 return `<section class="home-resources" aria-label="患者资料">
 <a class="resource-card knowledge-card" id="home-open-qr" href="${KNOWLEDGE_QR}" target="_blank" rel="noopener noreferrer" aria-label="放大守护宝典二维码">
 <img class="qr-thumbnail" src="${KNOWLEDGE_QR}" width="88" height="88" alt="sJIA守护者联盟守护宝典二维码">
 <span class="resource-copy"><strong>sJIA守护者联盟<br>守护宝典</strong><span class="resource-note">扫码加入知识库</span><span class="resource-action">查看二维码 <span aria-hidden="true">›</span></span></span></a>
 <a class="resource-card handbook-card" href="${HANDBOOK_URL}" target="_blank" rel="noopener noreferrer"><span class="book-icon" aria-hidden="true">▤</span><span>幼年特发性关节炎患者手册</span><span class="external-icon" aria-hidden="true">↗</span></a>
 <dialog class="home-qr-dialog" id="home-qr-dialog" aria-labelledby="home-qr-title"><h2 id="home-qr-title">守护宝典 · 二维码</h2><img src="${KNOWLEDGE_QR}" alt="sJIA守护者联盟守护宝典原始二维码"><p>长按二维码识别或保存，也可用另一台手机扫码。</p><button id="home-close-qr" type="button">关闭</button></dialog>
 </section>`;
}
