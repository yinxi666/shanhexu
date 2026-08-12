/* ============================================================
   赓续血脉・数绘红旅 — 首页创新功能区块 (Homepage Innovation)
   职责：在 #modules 区块后注入"创新功能"卡片区，并启动时间线
   约束：依赖 timeline(initTimeline)；被 app.js 初始化（首页）
   ============================================================ */

import { initTimeline } from './timeline.js?v=2026081319';
import { $ } from './ui.js?v=2026081319';
import { icon } from './icons.js?v=2026081319';
import { isHomePage } from './utils.js?v=2026081319';

function initHomepageInnovation() {
  if (!isHomePage()) return;

  initTimeline();

  const modulesSection = $('#modules');
  if (!modulesSection) return;

  const innovationHTML = `
        <section class="section">
          <div class="section-heading">
            <p class="eyebrow">Innovation</p>
            <h2>创新功能</h2>
            <p>AI赋能红色文旅，打造沉浸式数字学习体验</p>
          </div>
          <div class="feature-grid feature-grid-2col">
            <div class="feature-card feature-card-clickable" data-action="open-chat" tabindex="0" role="button">
              <div class="card-icon">${icon('chat')}</div>
              <span class="card-num">AI</span>
              <h3>AI智能导览助手</h3>
              <p>基于场馆知识库的对话式问答系统，支持场馆搜索、路线推荐、知识问答。</p>
              <span class="feature-card-action">点击体验 →</span>
            </div>
            <div class="feature-card feature-card-clickable" data-action="open-quiz" tabindex="0" role="button">
              <div class="card-icon">${icon('star')}</div>
              <span class="card-num">Quiz</span>
              <h3>红色知识挑战赛</h3>
              <p>每局随机10道红色历史与场馆知识题，测测你对革命文化的了解程度。</p>
              <span class="feature-card-action">开始挑战 →</span>
            </div>
            <div class="feature-card feature-card-clickable" data-action="toggle-dark" tabindex="0" role="button">
              <div class="card-icon">${icon('moon')}</div>
              <span class="card-num">UI</span>
              <h3>深色/浅色模式</h3>
              <p>一键切换深色模式，保护视力，适配不同阅读环境偏好。</p>
              <span class="feature-card-action">切换模式 →</span>
            </div>
            <div class="feature-card feature-card-clickable" data-action="open-cardgen" tabindex="0" role="button">
              <div class="card-icon">${icon('card')}</div>
              <span class="card-num">Card</span>
              <h3>红色纪念卡</h3>
              <p>输入姓名、选择红色精神，生成一张可下载、可分享的红色文创纪念卡。</p>
              <span class="feature-card-action">生成纪念卡 →</span>
            </div>
          </div>
        </section>
      `;
  modulesSection.insertAdjacentHTML('afterend', innovationHTML);
}

export { initHomepageInnovation };
