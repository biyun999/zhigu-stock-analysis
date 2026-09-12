#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修改智股分析短线潜力台账 - 历史日期列表展开详情功能"""

import re

APP_JS = '/app/data/所有对话/主对话/智股分析/app.js'
STYLE_CSS = '/app/data/所有对话/主对话/智股分析/style.css'
SW_JS = '/app/data/所有对话/主对话/智股分析/sw.js'
INDEX_HTML = '/app/data/所有对话/主对话/智股分析/index.html'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'OK {path} ({len(content)} bytes)')

# ============ 1. app.js ============
app_js = read_file(APP_JS)

# 1a. add _expandedIdx state
old_state = "const ShortTermLedger = {\n  STORAGE_KEY: 'zhigu_shortterm_snapshots',\n  MAX_SNAPSHOTS: 30,\n  _ledgerTab: 'verify',\n  _backtrackInput: '',\n  _backtrackCode: null,"
new_state = "const ShortTermLedger = {\n  STORAGE_KEY: 'zhigu_shortterm_snapshots',\n  MAX_SNAPSHOTS: 30,\n  _ledgerTab: 'verify',\n  _backtrackInput: '',\n  _backtrackCode: null,\n  _expandedIdx: null,"

assert old_state in app_js, 'state block not found'
app_js = app_js.replace(old_state, new_state)
print('OK 1a _expandedIdx state')

# 1b. rewrite _renderVerifyTab
old_render_verify = """  _renderVerifyTab(snaps, verifiedSnaps, totalWinRate) {
    let html = '';
    html += '<div class=\"ledger-stats-row\">';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\">' + snaps.length + '</div><div class=\"ls-label\">累计交易日</div></div>';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\">' + verifiedSnaps.length + '</div><div class=\"ls-label\">已核实</div></div>';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\" style=\"color:#00e676\">' + totalWinRate + '%</div><div class=\"ls-label\">平均胜率</div></div>';
    html += '</div>';

    // TOP10整体胜率
    if (verifiedSnaps.length > 0) {
      let totalHit = 0, totalResolved = 0;
      verifiedSnaps.forEach(s => { totalHit += (s.hitCount || 0); totalResolved += (s.resolvedCount || 0); });
      const overallRate = totalResolved > 0 ? Math.round(totalHit / totalResolved * 100) : 0;
      html += '<div class=\"ledger-section-title\">🎯 TOP10整体胜率</div>';
      html += '<div class=\"overall-winrate\">';
      html += '<span class=\"owr-num\" style=\"color:#00e676\">' + overallRate + '%</span>';
      html += '<span class=\"owr-sub\">共 ' + totalHit + '/' + totalResolved + ' 只次日收涨（' + verifiedSnaps.length + '个交易日）</span>';
      html += '</div>';
    }

    // 待核实提示 + 批量核实按钮
    const pending = snaps.filter(s => s.verified !== true);
    if (pending.length > 0) {
      html += '<div style=\"margin:8px 0 12px;display:flex;gap:8px;align-items:center\">';
      html += '<span style=\"font-size:11px;color:var(--text-muted)\">⏳ ' + pending.length + '个交易日待核实</span>';
      html += '<button onclick=\"ShortTermLedger.verifyAllPending()\" class=\"btn-primary\" style=\"flex:1;padding:8px 12px;font-size:12px;background:rgba(0,230,118,0.15);border:1px solid rgba(0,230,118,0.4);color:#00e676\">一键核实全部</button>';
      html += '</div>';
    }
    // 最近交易日列表
    html += '<div class=\"ledger-section-title\">📅 历史快照（' + snaps.length + '个交易日）</div>';
    html += '<div class=\"ledger-list\">';
    snaps.forEach((s, idx) => {
      const isVerified = s.verified === true;
      const wr = s.winRate || 0;
      html += '<div class=\"ledger-item\" onclick=\"ShortTermLedger._showSnapshotDetail(' + idx + ')\">';
      html += '<div class=\"ledger-date\">' + s.date + '</div>';
      html += '<div class=\"ledger-info\">';
      html += '<span class=\"ledger-count\">' + (s.stocks ? s.stocks.length : 0) + '只</span>';
      if (s.fallbackMode && s.fallbackMode !== 'normal') {
        const modeTag = { concept: '🟡 概念', market: '🟠 全市场', static: '⚪ 静态' }[s.fallbackMode] || '';
        if (modeTag) html += '<span class=\"ledger-tag\">' + modeTag + '</span>';
      }
      html += '</div>';
      if (isVerified) {
        const wrColor = wr >= 70 ? '#00e676' : wr >= 50 ? '#ff9800' : '#ff5252';
        html += '<div class=\"ledger-winrate\" style=\"color:' + wrColor + '\">✅ ' + wr + '%</div>';
      } else {
        html += '<div class=\"ledger-winrate\" style=\"color:#8a8e9b\">⏳ 待核实</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    html += '<div style=\"font-size:11px;color:var(--text-muted);text-align:center;padding:12px 0 4px;line-height:1.6\">数据全部保存在本机，最多留存30个交易日，点击任意日期查看详细榜单</div>';
    return html;
  },"""

new_render_verify = """  _renderVerifyTab(snaps, verifiedSnaps, totalWinRate) {
    // TOP10整体胜率计算
    let totalHit = 0, totalResolved = 0;
    if (verifiedSnaps.length > 0) {
      verifiedSnaps.forEach(s => { totalHit += (s.hitCount || 0); totalResolved += (s.resolvedCount || 0); });
    }
    const overallRate = totalResolved > 0 ? Math.round(totalHit / totalResolved * 100) : 0;

    let html = '';
    // 紧凑统计卡片
    html += '<div class=\"ledger-stats-row st-ledger-stats\">';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\">' + snaps.length + '</div><div class=\"ls-label\">累计交易日</div></div>';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\">' + verifiedSnaps.length + '</div><div class=\"ls-label\">已核实</div></div>';
    html += '<div class=\"ledger-stat-card\"><div class=\"ls-num\" style=\"color:#00e676\">' + totalWinRate + '%</div><div class=\"ls-label\">平均胜率</div></div>';
    html += '</div>';

    // 待核实提示 + 批量核实按钮（紧凑行）
    const pending = snaps.filter(s => s.verified !== true);
    if (pending.length > 0) {
      html += '<div class=\"st-ledger-pending-bar\">';
      html += '<span class=\"st-ledger-pending-tip\">⏳ ' + pending.length + '个交易日待核实</span>';
      html += '<button onclick=\"ShortTermLedger.verifyAllPending()\" class=\"btn-primary st-ledger-verify-btn\">一键核实全部</button>';
      html += '</div>';
    }

    // 整体胜率小标签（已核实有数据时显示）
    if (verifiedSnaps.length > 0) {
      html += '<div class=\"st-ledger-overall-bar\">';
      html += '<span>🎯 TOP10整体胜率 <b style=\"color:#00e676\">' + overallRate + '%</b></span>';
      html += '<span class=\"st-ledger-overall-sub\">' + totalHit + '/' + totalResolved + ' 只次日收涨</span>';
      html += '</div>';
    }

    // 历史日期列表（主体）
    html += '<div class=\"ledger-list st-ledger-list\">';
    snaps.forEach((s, idx) => {
      const isVerified = s.verified === true;
      const wr = s.winRate || 0;
      const isExpanded = this._expandedIdx === idx;
      // 热门板块前2个
      const sectors = s.topSectors || [];
      const sectorTags = sectors.slice(0, 2).map(sec => {
        const name = typeof sec === 'string' ? sec : (sec.name || sec);
        return '<span class=\"ledger-tag st-sector-tag\">🔥 ' + name + '</span>';
      }).join('');

      html += '<div class=\"ledger-item st-ledger-item' + (isExpanded ? ' expanded' : '') + '\" onclick=\"ShortTermLedger._showSnapshotDetail(' + idx + ')\">';
      html += '<div class=\"st-ledger-item-main\">';
      html += '<div class=\"ledger-date\">' + s.date + '</div>';
      html += '<div class=\"ledger-info\">';
      html += '<span class=\"ledger-count\">' + (s.stocks ? s.stocks.length : 0) + '只</span>';
      if (s.fallbackMode && s.fallbackMode !== 'normal') {
        const modeTag = { concept: '🟡 概念', market: '🟠 全市场', static: '⚪ 静态' }[s.fallbackMode] || '';
        if (modeTag) html += '<span class=\"ledger-tag\">' + modeTag + '</span>';
      }
      html += sectorTags;
      html += '</div>';
      if (isVerified) {
        const wrColor = wr >= 70 ? '#00e676' : wr >= 50 ? '#ff9800' : '#ff5252';
        html += '<div class=\"ledger-winrate\" style=\"color:' + wrColor + '\">✅ ' + wr + '%</div>';
      } else {
        html += '<div class=\"ledger-winrate\" style=\"color:#8a8e9b\">⏳ 待核实</div>';
      }
      html += '<div class=\"st-ledger-expand-icon\">' + (isExpanded ? '▲' : '▼') + '</div>';
      html += '</div>';

      // 展开的明细
      if (isExpanded) {
        html += '<div class=\"st-ledger-detail\">';
        html += '<div class=\"st-ledger-detail-header\">';
        html += '<span class=\"st-ledger-detail-date\">📅 ' + s.date + ' TOP10 完整榜单</span>';
        if (s.topSectors && s.topSectors.length > 0) {
          const allSectors = s.topSectors.map(sec => {
            const name = typeof sec === 'string' ? sec : (sec.name || sec);
            return '<span class=\"st-detail-sector-tag\">🔥 ' + name + '</span>';
          }).join('');
          html += '<div class=\"st-ledger-detail-sectors\">' + allSectors + '</div>';
        }
        html += '</div>';
        html += '<div class=\"st-ledger-detail-list\">';
        (s.stocks || []).forEach((stock, sIdx) => {
          const rank = sIdx + 1;
          const rankCls = rank <= 3 ? 'top' + rank : '';
          const isV = stock.verified === true;
          const nextChg = stock.nextChangePct;
          const chgColor = isV
            ? ((nextChg || 0) >= 0 ? '#00e676' : '#ff5252')
            : '#8a8e9b';
          const chgStr = isV
            ? ((nextChg >= 0 ? '+' : '') + nextChg.toFixed(2) + '%')
            : '待核实';
          const score = stock.total || stock.score || 0;
          const scoreColor = rank <= 3 ? '#ff5252' : rank <= 6 ? '#ff9800' : '#00d4ff';

          html += '<div class=\"hot-stock-item st-card st-detail-stock-item\" onclick=\"event.stopPropagation();App.analyzeStock(\\'' + stock.code + '\\')\">';
          html += '<div class=\"rank ' + rankCls + '\">' + rank + '</div>';
          html += '<div class=\"hs-info\">';
          html += '<div class=\"hs-name\">' + stock.name + ' <span style=\"font-size:10px;color:var(--text-muted);font-weight:400\">[' + (stock.sectorName || '-') + ']</span></div>';
          html += '<div class=\"hs-code\">' + stock.code.replace(/^(sh|sz|bj)/, '').toUpperCase() + ' · 次日' + chgStr + '</div>';
          html += '</div>';
          html += '<div class=\"hs-score\">';
          html += '<div class=\"hs-score-val\" style=\"color:' + scoreColor + '\">' + score + '</div>';
          html += '<div class=\"hs-score-label\">得分</div>';
          html += '</div>';
          html += '<div class=\"st-detail-nextchg\" style=\"color:' + chgColor + '\">';
          html += '<div class=\"hs-price-val\" style=\"color:' + chgColor + ';font-size:14px\">' + (isV ? (nextChg >= 0 ? '+' : '') + nextChg.toFixed(2) + '%' : '—') + '</div>';
          html += '<div class=\"hs-score-label\" style=\"font-size:10px\">次日涨跌幅</div>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    html += '<div style=\"font-size:11px;color:var(--text-muted);text-align:center;padding:12px 0 4px;line-height:1.6\">数据全部保存在本机，最多留存30个交易日，点击日期展开/收起当日TOP10明细</div>';
    return html;
  },"""

assert old_render_verify in app_js, '_renderVerifyTab not found'
app_js = app_js.replace(old_render_verify, new_render_verify)
print('OK 1b _renderVerifyTab rewritten')

# 1c. replace _showSnapshotDetail
old_show_detail = """  _showSnapshotDetail(idx) {
    const snaps = this._loadSnapshots();
    const snap = snaps[idx];
    if (!snap) return;
    Utils.toast ? Utils.toast(snap.date + '：' + (snap.stocks ? snap.stocks.length : 0) + '只标的' + (snap.verified ? '，胜率' + snap.winRate + '%' : '，待核实')) : null;
  },
};"""

new_show_detail = """  _showSnapshotDetail(idx) {
    // 展开/收起当日明细：同一时间只展开一个
    this._expandedIdx = (this._expandedIdx === idx) ? null : idx;
    const snaps = this._loadSnapshots();
    const overlay = document.getElementById('st-ledger-overlay');
    if (overlay) overlay.innerHTML = this._renderLedger(snaps);
  },
};"""

assert old_show_detail in app_js, '_showSnapshotDetail not found'
app_js = app_js.replace(old_show_detail, new_show_detail)
print('OK 1c _showSnapshotDetail expanded mode')

# 1d. header comment
old_header = " * v4.4-P4: 历史验证台账+档位胜率统计+历史排名可查询"
new_header = " * v4.4-P4: 历史验证台账+档位胜率统计+历史排名可查询\n * v4.4-P6b: 短线台账日期列表可展开查看TOP10明细，热门板块标签展示"
assert old_header in app_js, 'header comment not found'
app_js = app_js.replace(old_header, new_header)
print('OK 1d header version comment')

write_file(APP_JS, app_js)

# ============ 2. style.css ============
css = read_file(STYLE_CSS)

old_css_anchor = ".ledger-winrate{font-size:12px;font-weight:600;font-family:monospace;min-width:60px;text-align:right}\n"

new_styles = """.ledger-winrate{font-size:12px;font-weight:600;font-family:monospace;min-width:60px;text-align:right}

/* ===== v4.4 P6b: 短线台账展开详情样式 ===== */
.st-ledger-stats{margin-bottom:10px}
.st-ledger-stats .ledger-stat-card{padding:8px 6px}
.st-ledger-stats .ls-num{font-size:16px}
.st-ledger-stats .ls-label{font-size:10px}
.st-ledger-pending-bar{display:flex;gap:8px;align-items:center;margin:4px 0 8px}
.st-ledger-pending-tip{font-size:11px;color:var(--text-muted)}
.st-ledger-verify-btn{flex:1;padding:6px 10px;font-size:11px;background:rgba(0,230,118,0.15);border:1px solid rgba(0,230,118,0.4);color:#00e676}
.st-ledger-overall-bar{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.2);border-radius:6px;font-size:11px;color:var(--text-secondary);margin-bottom:8px}
.st-ledger-overall-sub{color:var(--text-muted);font-size:10px}
.st-ledger-list{gap:4px}
.st-ledger-item{display:block;padding:0}
.st-ledger-item-main{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}
.st-ledger-item:active .st-ledger-item-main{background:rgba(100,150,255,0.1)}
.st-ledger-expand-icon{font-size:10px;color:var(--text-muted);margin-left:8px;min-width:16px;text-align:center;transition:transform .2s}
.st-sector-tag{background:rgba(255,152,0,0.12);color:#ff9800 !important;border-radius:4px;padding:1px 5px}
.st-ledger-detail{padding:8px 12px 12px;border-top:1px solid var(--border-color);background:rgba(0,0,0,0.2);border-radius:0 0 8px 8px;animation:stDetailSlide .25s ease-out}
@keyframes stDetailSlide{from{opacity:0;max-height:0;transform:translateY(-6px)}to{opacity:1;max-height:2000px;transform:translateY(0)}}
.st-ledger-detail-header{margin-bottom:8px}
.st-ledger-detail-date{font-size:12px;font-weight:600;color:var(--text-primary)}
.st-ledger-detail-sectors{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.st-detail-sector-tag{font-size:10px;color:#ff9800;background:rgba(255,152,0,0.1);padding:2px 6px;border-radius:4px}
.st-ledger-detail-list{display:flex;flex-direction:column;gap:2px}
.st-detail-stock-item{padding:8px 10px !important;border-radius:6px !important}
.st-detail-stock-item .rank{width:22px;height:22px;font-size:11px;line-height:22px}
.st-detail-stock-item .hs-name{font-size:12px}
.st-detail-stock-item .hs-code{font-size:10px}
.st-detail-stock-item .hs-score{min-width:38px;text-align:center}
.st-detail-stock-item .hs-score-val{font-size:14px}
.st-detail-stock-item .hs-score-label{font-size:9px}
.st-detail-nextchg{text-align:right;min-width:60px}
.st-detail-nextchg .hs-price-val{font-size:13px;font-weight:600;font-family:monospace}
"""

assert old_css_anchor in css, 'CSS anchor not found'
css = css.replace(old_css_anchor, new_styles)
print('OK 2 CSS styles added')

write_file(STYLE_CSS, css)

# ============ 3. sw.js ============
sw = read_file(SW_JS)
old_cache = "const CACHE_NAME = 'zhigu-v4.4-p6';"
new_cache = "const CACHE_NAME = 'zhigu-v4.4-p6b';"
assert old_cache in sw, 'sw CACHE_NAME not found'
sw = sw.replace(old_cache, new_cache)
print('OK 3 sw.js CACHE_NAME updated')
write_file(SW_JS, sw)

# ============ 4. index.html ============
html = read_file(INDEX_HTML)
old_ver = "智股分析 v4.4-p6"
new_ver = "智股分析 v4.4-p6b"
assert old_ver in html, 'index version not found'
html = html.replace(old_ver, new_ver)
print('OK 4 index.html version updated')
write_file(INDEX_HTML, html)

print('\nALL DONE')
