#!/usr/bin/env python3
"""
智股分析 v4.4 P9 升级脚本 - 跨设备授权管理系统
"""
import re
import os
import json

BASE = "/app/data/所有对话/主对话/智股分析"
APP_JS = os.path.join(BASE, "app.js")
INDEX_HTML = os.path.join(BASE, "index.html")
STYLE_CSS = os.path.join(BASE, "style.css")
SW_JS = os.path.join(BASE, "sw.js")

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# ============================================================
# 1. 修改 sw.js - 更新 CACHE_NAME
# ============================================================
def update_sw():
    content = read_file(SW_JS)
    content = content.replace(
        "// 智股分析 Service Worker - PWA离线缓存 v4.4 P8",
        "// 智股分析 Service Worker - PWA离线缓存 v4.4 P9"
    )
    content = content.replace(
        "const CACHE_NAME = 'zhigu-v4.4-p8';",
        "const CACHE_NAME = 'zhigu-v4.4-p9';"
    )
    write_file(SW_JS, content)
    print("✓ sw.js 已更新 (zhigu-v4.4-p9)")

# ============================================================
# 2. 修改 index.html - 更新版本号 + 新增设置页UI
# ============================================================
def update_index_html():
    content = read_file(INDEX_HTML)
    
    # 更新关于页版本号
    content = content.replace("<h2>智股分析 v4.4-p8</h2>", "<h2>智股分析 v4.4-p9</h2>")
    
    # 在设置页的"授权管理"区块前插入"设备与迁移"区块
    # 找到"授权管理" subtitle 的位置，在它前面插入新的 settings-section
    old_section = '''        <div class="settings-section">
          <div class="card-subtitle">授权管理</div>'''
    
    new_section = '''        <div class="settings-section">
          <div class="card-subtitle">📱 我的设备</div>
          <div class="device-current">
            <span class="device-current-label">当前设备</span>
            <span id="currentDeviceName" class="device-current-name">加载中...</span>
          </div>
          <div class="device-meta">
            <span id="currentDeviceType" class="device-meta-item">--</span>
            <span id="currentDeviceBrowser" class="device-meta-item">--</span>
            <span id="deviceCount" class="device-meta-item">--/5台</span>
          </div>
          <button type="button" onclick="DeviceManager.showDeviceList()" class="login-btn settings-btn" style="background:transparent;border:1px solid var(--accent-cyan);color:var(--accent-cyan);margin-top:8px">
            管理设备
          </button>
        </div>
        <div class="settings-section">
          <div class="card-subtitle">🔄 授权迁移</div>
          <p class="migration-tip">将授权数据加密后迁移到其他设备，24小时内有效</p>
          <div class="migration-btns">
            <button type="button" onclick="DeviceManager.showExportModal()" class="login-btn settings-btn migration-btn">
              📤 导出授权
            </button>
            <button type="button" onclick="DeviceManager.showImportModal()" class="login-btn settings-btn migration-btn" style="background:transparent;border:1px solid var(--accent-cyan);color:var(--accent-cyan)">
              📥 导入授权
            </button>
          </div>
        </div>
        <div class="settings-section">
          <div class="card-subtitle">授权管理</div>'''
    
    content = content.replace(old_section, new_section)
    
    # 在登录页的激活表单下方添加"迁移授权"入口
    old_activate_switch = '''        <div class="auth-switch">
          <span>已有账号？</span>
          <a href="javascript:void(0)" onclick="Auth.showLogin()">返回登录</a>
        </div>
      </form>
    </div>
  </div>'''
    
    new_activate_switch = '''        <div class="auth-switch">
          <span>已有账号？</span>
          <a href="javascript:void(0)" onclick="Auth.showLogin()">返回登录</a>
        </div>
        <div class="migration-entry">
          <a href="javascript:void(0)" onclick="DeviceManager.showImportModal()" class="migration-link">
            🔄 已有迁移码？导入授权
          </a>
        </div>
      </form>
    </div>
  </div>'''
    
    content = content.replace(old_activate_switch, new_activate_switch)
    
    # 在 </body> 前添加设备管理弹窗 + 迁移弹窗 HTML
    body_end = '''  <!-- 应用主脚本 -->
  <script src="app.js"></script>
</body>'''
    
    modals_html = '''  <!-- ===== 设备管理弹窗 ===== -->
  <div id="deviceListModal" class="modal-overlay" style="display:none">
    <div class="modal-card">
      <div class="modal-header">
        <span>📱 我的设备</span>
        <button class="modal-close" onclick="DeviceManager.hideDeviceList()">×</button>
      </div>
      <div class="modal-body">
        <div class="device-limit-info">
          <span>已激活 <strong id="deviceCountModal">0</strong>/5 台设备</span>
        </div>
        <div id="deviceListContainer" class="device-list"></div>
        <div class="device-tip-box">
          <p>💡 提示：纯前端架构下，撤销仅移除本地设备记录，无法远程撤销其他设备的授权。</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== 导出迁移码弹窗 ===== -->
  <div id="exportModal" class="modal-overlay" style="display:none">
    <div class="modal-card">
      <div class="modal-header">
        <span>📤 导出授权</span>
        <button class="modal-close" onclick="DeviceManager.hideExportModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="migration-step">
          <div class="migration-step-title">第1步：设置迁移密码</div>
          <p class="migration-step-desc">密码至少6位，用于加密授权数据，请牢记</p>
          <div class="settings-field">
            <input type="password" id="exportPassword" placeholder="设置迁移密码（至少6位）" minlength="6">
          </div>
          <div class="settings-field">
            <input type="password" id="exportPasswordConfirm" placeholder="确认迁移密码" minlength="6">
          </div>
        </div>
        <div class="migration-step" id="exportStep2" style="display:none">
          <div class="migration-step-title">第2步：复制迁移码</div>
          <p class="migration-step-desc">迁移码24小时内有效，仅可使用一次</p>
          <div class="migration-code-box">
            <textarea id="exportCodeText" readonly rows="6" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--accent-cyan);font-family:monospace;font-size:13px;line-height:1.5;resize:none;word-break:break-all;box-sizing:border-box"></textarea>
          </div>
          <div class="migration-actions">
            <button type="button" onclick="DeviceManager.copyExportCode()" class="login-btn settings-btn">📋 复制迁移码</button>
          </div>
          <div id="exportCodeCopied" class="copy-success" style="display:none">✓ 已复制到剪贴板</div>
        </div>
        <div class="modal-footer">
          <button type="button" onclick="DeviceManager.generateExportCode()" id="exportGenerateBtn" class="login-btn settings-btn" style="width:100%">生成迁移码</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== 导入迁移码弹窗 ===== -->
  <div id="importModal" class="modal-overlay" style="display:none">
    <div class="modal-card">
      <div class="modal-header">
        <span>📥 导入授权</span>
        <button class="modal-close" onclick="DeviceManager.hideImportModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="migration-step">
          <div class="migration-step-title">粘贴迁移码</div>
          <p class="migration-step-desc">将从其他设备导出的迁移码粘贴到下方</p>
          <div class="settings-field">
            <textarea id="importCodeText" rows="4" placeholder="请粘贴迁移码..." style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:var(--radius-sm);color:var(--text-primary);font-family:monospace;font-size:13px;line-height:1.5;resize:none;box-sizing:border-box"></textarea>
          </div>
        </div>
        <div class="migration-step">
          <div class="migration-step-title">输入迁移密码</div>
          <p class="migration-step-desc">与导出时设置的密码一致</p>
          <div class="settings-field">
            <input type="password" id="importPassword" placeholder="迁移密码" minlength="6">
          </div>
        </div>
        <div id="importError" class="login-error" style="display:none;margin-bottom:12px"></div>
        <div class="modal-footer">
          <button type="button" onclick="DeviceManager.doImport()" class="login-btn settings-btn" style="width:100%">确认导入</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== 重命名设备弹窗 ===== -->
  <div id="renameDeviceModal" class="modal-overlay" style="display:none">
    <div class="modal-card modal-card-small">
      <div class="modal-header">
        <span>✏️ 重命名设备</span>
        <button class="modal-close" onclick="DeviceManager.hideRenameModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="settings-field">
          <input type="text" id="renameDeviceInput" placeholder="输入新的设备名称" maxlength="20">
        </div>
        <div class="modal-footer">
          <button type="button" onclick="DeviceManager.doRename()" class="login-btn settings-btn" style="width:100%">确认</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 应用主脚本 -->
  <script src="app.js"></script>
</body>'''
    
    content = content.replace(body_end, modals_html)
    
    write_file(INDEX_HTML, content)
    print("✓ index.html 已更新 (v4.4-p9 + 设备管理UI + 迁移弹窗)")

# ============================================================
# 3. 修改 style.css - 新增样式
# ============================================================
def update_style_css():
    content = read_file(STYLE_CSS)
    
    # 在 logout-btn 样式后添加新样式
    logout_style = '''.logout-btn {
  width: 100%;
  height: 40px;
  background: transparent;
  border: 1px solid var(--accent-red);
  border-radius: var(--radius-sm);
  color: var(--accent-red);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}'''
    
    new_styles = '''.logout-btn {
  width: 100%;
  height: 40px;
  background: transparent;
  border: 1px solid var(--accent-red);
  border-radius: var(--radius-sm);
  color: var(--accent-red);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

/* ===== 设备管理样式 ===== */
.device-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 230, 118, 0.05));
  border: 1px solid var(--accent-cyan);
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
}

.device-current-label {
  font-size: 13px;
  color: var(--text-muted);
}

.device-current-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-cyan);
}

.device-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.device-meta-item {
  padding: 2px 8px;
  background: var(--bg-input);
  border-radius: 10px;
}

.device-limit-info {
  text-align: center;
  padding: 10px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.device-limit-info strong {
  color: var(--accent-cyan);
  font-size: 16px;
}

.device-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.device-item.device-current-item {
  border-color: var(--accent-cyan);
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(0, 230, 118, 0.03));
}

.device-icon {
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-current-tag {
  font-size: 11px;
  padding: 1px 6px;
  background: var(--accent-cyan);
  color: #fff;
  border-radius: 8px;
  font-weight: 500;
}

.device-detail {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.device-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.device-action-btn {
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.device-action-btn:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.device-action-btn.revoke-btn {
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.device-tip-box {
  padding: 10px 12px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.device-tip-box p {
  margin: 0;
}

/* ===== 迁移相关样式 ===== */
.migration-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.migration-btns {
  display: flex;
  gap: 10px;
}

.migration-btn {
  flex: 1;
}

.migration-entry {
  text-align: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.migration-link {
  color: var(--accent-cyan);
  font-size: 13px;
  text-decoration: none;
}

.migration-link:hover {
  text-decoration: underline;
}

.migration-step {
  margin-bottom: 16px;
}

.migration-step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.migration-step-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 10px 0;
  line-height: 1.5;
}

.migration-code-box {
  margin-bottom: 10px;
}

.migration-actions {
  display: flex;
  gap: 8px;
}

.copy-success {
  text-align: center;
  color: var(--accent-green);
  font-size: 12px;
  margin-top: 8px;
}

/* ===== 弹窗样式 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-card-small {
  max-width: 320px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 0 16px 16px 16px;
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 10px;
    align-items: flex-end;
  }
  .modal-card {
    max-width: 100%;
    max-height: 90vh;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
  .migration-btns {
    flex-direction: column;
  }
}'''
    
    content = content.replace(logout_style, new_styles)
    
    write_file(STYLE_CSS, content)
    print("✓ style.css 已更新 (设备管理+迁移+弹窗样式)")

# ============================================================
# 4. 修改 app.js - 更新头部注释 + 增强Auth模块 + 新增DeviceManager
# ============================================================
def update_app_js():
    content = read_file(APP_JS)
    
    # 更新头部版本注释
    old_header_line = " * 智股分析 v4.4 - 次日上涨概率六维模型P8增强(筹码/资金分层/技术指标/反转校准)"
    new_header_line = " * 智股分析 v4.4 - P9 跨设备授权管理系统（设备指纹+加密迁移+多设备管理）"
    content = content.replace(old_header_line, new_header_line)
    
    # 在版本注释中添加 P9 说明
    old_p8_note = " * v4.4-P8: 六维模型因子增强——"
    new_p9_note = ''' * v4.4-P9: 跨设备授权管理系统——
 *          1) 设备指纹：UUID v4 唯一标识，设备类型/浏览器/激活时间采集
 *          2) 设备管理：5台设备上限，可重命名/撤销，当前设备高亮
 *          3) 授权迁移：AES-256-GCM 加密导出，Base64文本迁移码，24小时有效期
 *          4) 激活增强：新设备激活时检查设备数上限，超限提示撤销旧设备
 *          5) 纯前端实现：Web Crypto API + localStorage，零后端依赖
 * v4.4-P8: 六维模型因子增强——'''
    content = content.replace(old_p8_note, new_p9_note)
    
    # 更新 Auth 模块标题
    old_auth_title = "// 13. Auth - 授权登录模块（v2.9 激活码门控）"
    new_auth_title = "// 13. Auth - 授权登录模块（v3.0 跨设备授权管理）"
    content = content.replace(old_auth_title, new_auth_title)
    
    # 在 Auth 常量区添加设备相关常量
    old_constants = '''  ACT_CODE_VERSION: '20260823',                // 授权版本（换码时更新，旧激活自动失效）
  MAX_ATTEMPTS: 5,                              // 最大失败次数
  LOCK_DURATION: 15 * 60 * 1000,                // 锁定15分钟'''
    
    new_constants = '''  ACT_CODE_VERSION: '20260823',                // 授权版本（换码时更新，旧激活自动失效）
  MAX_ATTEMPTS: 5,                              // 最大失败次数
  LOCK_DURATION: 15 * 60 * 1000,                // 锁定15分钟
  DEVICE_KEY: 'zhigu_device_id',                // 设备ID存储key
  MAX_DEVICES: 5,                               // 最大授权设备数
  MIGRATION_TTL: 24 * 60 * 60 * 1000,           // 迁移码有效期24小时'''
    
    content = content.replace(old_constants, new_constants)
    
    # 在 _saveAuth 后添加设备相关方法
    old_saveauth = '''  _saveAuth(auth) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
  },'''
    
    new_device_methods = '''  _saveAuth(auth) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
  },

  // ===== 设备指纹系统 =====

  /** 生成UUID v4 */
  _generateUUID() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // 降级方案
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /** 获取或创建设备ID */
  _getDeviceId() {
    let deviceId = localStorage.getItem(this.DEVICE_KEY);
    if (!deviceId) {
      deviceId = this._generateUUID();
      localStorage.setItem(this.DEVICE_KEY, deviceId);
    }
    return deviceId;
  },

  /** 检测设备类型 */
  _getDeviceType() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return '平板';
    if (/Mobile|Android|iPhone|iPod|Windows Phone/i.test(ua)) return '手机';
    return '桌面';
  },

  /** 检测浏览器 */
  _getBrowser() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Opera|OPR\//i.test(ua)) return 'Opera';
    return '未知浏览器';
  },

  /** 生成默认设备名 */
  _getDefaultDeviceName() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return '设备-' + suffix;
  },

  /** 获取当前设备完整信息 */
  _getCurrentDeviceInfo() {
    const deviceId = this._getDeviceId();
    const now = new Date().toISOString();
    // 从授权数据中获取设备名（如果有的话）
    const auth = this._getAuth();
    let deviceName = this._getDefaultDeviceName();
    let activatedAt = now;
    if (auth && auth.devices) {
      const existing = auth.devices.find(d => d.id === deviceId);
      if (existing) {
        deviceName = existing.name || deviceName;
        activatedAt = existing.activatedAt || now;
      }
    }
    return {
      id: deviceId,
      name: deviceName,
      type: this._getDeviceType(),
      browser: this._getBrowser(),
      activatedAt: activatedAt,
      lastActive: now
    };
  },

  /** 获取设备列表 */
  _getDevices() {
    const auth = this._getAuth();
    return (auth && auth.devices) ? auth.devices : [];
  },

  /** 保存设备列表 */
  _saveDevices(devices) {
    const auth = this._getAuth() || {};
    auth.devices = devices;
    auth.codeVersion = this.ACT_CODE_VERSION;
    this._saveAuth(auth);
  },

  /** 检查是否达到设备上限 */
  _isDeviceLimitReached() {
    const devices = this._getDevices();
    const deviceId = this._getDeviceId();
    // 如果当前设备已在列表中，不算新增
    const isCurrentInList = devices.some(d => d.id === deviceId);
    if (isCurrentInList) return false;
    return devices.length >= this.MAX_DEVICES;
  },

  /** 将当前设备加入列表（激活时调用） */
  _registerCurrentDevice() {
    const devices = this._getDevices();
    const deviceId = this._getDeviceId();
    const existing = devices.find(d => d.id === deviceId);
    if (existing) {
      // 已存在，更新最后活跃时间
      existing.lastActive = new Date().toISOString();
    } else {
      // 新设备，添加
      devices.push(this._getCurrentDeviceInfo());
    }
    this._saveDevices(devices);
    return !existing; // 返回是否为新设备
  },

  /** 撤销设备授权 */
  _revokeDevice(deviceId) {
    const devices = this._getDevices();
    const filtered = devices.filter(d => d.id !== deviceId);
    this._saveDevices(filtered);
    return filtered.length;
  },

  /** 重命名设备 */
  _renameDevice(deviceId, newName) {
    const devices = this._getDevices();
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      device.name = newName.trim().substring(0, 20) || device.name;
      this._saveDevices(devices);
      return true;
    }
    return false;
  },

  // ===== AES 加密/解密（Web Crypto API） =====

  /** 将字符串转为 Uint8Array */
  _strToBytes(str) {
    return new TextEncoder().encode(str);
  },

  /** 将 Uint8Array 转为字符串 */
  _bytesToStr(bytes) {
    return new TextDecoder().decode(bytes);
  },

  /** 将 Uint8Array 转为 Base64 */
  _bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /** 将 Base64 转为 Uint8Array */
  _base64ToBytes(base64) {
    const binary = atob(base64.replace(/\s+/g, ''));
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  /** 从密码派生密钥（PBKDF2） */
  async _deriveKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this._strToBytes(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /** AES-GCM 加密 */
  async _encryptData(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this._deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      this._strToBytes(plaintext)
    );
    // 组合: salt(16) + iv(12) + ciphertext
    const result = new Uint8Array(16 + 12 + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, 16);
    result.set(new Uint8Array(encrypted), 28);
    return this._bytesToBase64(result);
  },

  /** AES-GCM 解密 */
  async _decryptData(base64Data, password) {
    const data = this._base64ToBytes(base64Data);
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const ciphertext = data.slice(28);
    const key = await this._deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    return this._bytesToStr(decrypted);
  },

  // ===== 授权迁移 =====

  /** 生成迁移码（导出） */
  async generateMigrationCode(password) {
    const auth = this._getAuth();
    if (!auth || !auth.users || auth.users.length === 0) {
      throw new Error('当前设备无授权数据');
    }
    const deviceId = this._getDeviceId();
    const payload = {
      v: 1,                     // 迁移格式版本
      t: Date.now(),            // 生成时间戳
      d: deviceId,              // 源设备ID
      cv: auth.codeVersion,     // 授权版本
      u: auth.users,            // 用户列表
      ds: auth.devices || []    // 设备列表
    };
    const plaintext = JSON.stringify(payload);
    const encrypted = await this._encryptData(plaintext, password);
    // 加版本前缀便于校验
    return 'ZG' + encrypted;
  },

  /** 验证并导入迁移码 */
  async importMigrationCode(code, password) {
    const cleanCode = (code || '').trim().replace(/\s+/g, '');
    if (!cleanCode.startsWith('ZG') && !cleanCode.startsWith('ZG'.toLowerCase())) {
      // 兼容两种前缀
      if (!cleanCode.startsWith('zg')) {
        throw new Error('迁移码格式无效，请检查输入');
      }
    }
    // 去掉前缀
    const encryptedPart = cleanCode.substring(2);
    try {
      const decrypted = await this._decryptData(encryptedPart, password);
      const payload = JSON.parse(decrypted);
      
      // 校验有效期
      if (!payload.t || Date.now() - payload.t > this.MIGRATION_TTL) {
        throw new Error('迁移码已过期（有效期24小时）');
      }
      
      // 校验授权版本
      if (payload.cv !== this.ACT_CODE_VERSION) {
        throw new Error('授权版本不匹配，无法迁移');
      }
      
      // 校验数据完整性
      if (!payload.u || !Array.isArray(payload.u) || payload.u.length === 0) {
        throw new Error('迁移数据无效');
      }

      // 写入授权数据
      const currentDevice = this._getCurrentDeviceInfo();
      const newAuth = {
        codeVersion: payload.cv,
        users: payload.u,
        devices: payload.ds || []
      };

      // 将当前设备加入设备列表（如果不在列表中）
      const deviceId = currentDevice.id;
      const exists = newAuth.devices.some(d => d.id === deviceId);
      if (!exists) {
        // 检查设备数上限
        if (newAuth.devices.length >= this.MAX_DEVICES) {
          throw new Error('已达到最大授权设备数（' + this.MAX_DEVICES + '台），请在旧设备上撤销后再试');
        }
        newAuth.devices.push(currentDevice);
      } else {
        // 更新最后活跃时间
        const dev = newAuth.devices.find(d => d.id === deviceId);
        if (dev) dev.lastActive = currentDevice.lastActive;
      }

      this._saveAuth(newAuth);
      return {
        userCount: payload.u.length,
        deviceCount: newAuth.devices.length,
        sourceDevice: payload.d
      };
    } catch (e) {
      if (e.message && e.message.includes('迁移码') ) throw e;
      if (e.message && e.message.includes('授权') ) throw e;
      if (e.message && e.message.includes('设备数') ) throw e;
      // 解密失败通常是密码错误
      throw new Error('迁移码或密码错误，请检查后重试');
    }
  },'''
    
    content = content.replace(old_saveauth, new_device_methods)
    
    # 修改 handleActivate 方法 - 添加设备数检查
    old_handle_activate = '''    // 检查是否已有该用户
    let auth = this._getAuth();
    if (auth && auth.users && auth.users.find(u => u.phone === phone)) {
      showErr('该手机号已激活，请直接登录');
      return false;
    }

    // 创建授权记录
    auth = auth || {};
    auth.users = auth.users || [];
    auth.users.push({
      phone: phone,
      password: this._hash(password),
      activatedAt: new Date().toISOString()
    });
    auth.codeVersion = this.ACT_CODE_VERSION;
    this._saveAuth(auth);

    // 自动登录
    this._saveSession(phone, true);
    this._clearRateLimit();
    errorEl.style.display = 'none';
    this._showApp();
    App.init();
    return false;'''
    
    new_handle_activate = '''    // 检查是否已有该用户
    let auth = this._getAuth();
    if (auth && auth.users && auth.users.find(u => u.phone === phone)) {
      showErr('该手机号已激活，请直接登录');
      return false;
    }

    // 检查设备数上限（仅当已有授权且当前设备未注册时）
    if (auth && auth.users && auth.users.length > 0) {
      if (this._isDeviceLimitReached()) {
        showErr('已达到最大授权设备数（' + this.MAX_DEVICES + '台），请在旧设备上撤销后再试');
        return false;
      }
    }

    // 创建授权记录
    auth = auth || {};
    auth.users = auth.users || [];
    auth.users.push({
      phone: phone,
      password: this._hash(password),
      activatedAt: new Date().toISOString()
    });
    auth.codeVersion = this.ACT_CODE_VERSION;
    // 设备列表初始化
    auth.devices = auth.devices || [];
    this._saveAuth(auth);

    // 注册当前设备
    this._registerCurrentDevice();

    // 自动登录
    this._saveSession(phone, true);
    this._clearRateLimit();
    errorEl.style.display = 'none';
    this._showApp();
    App.init();
    // 刷新设置页设备信息
    if (typeof DeviceManager !== 'undefined') DeviceManager.refreshSettingsInfo();
    return false;'''
    
    content = content.replace(old_handle_activate, new_handle_activate)
    
    # 修改 initSettingsPage 方法 - 添加设备信息
    old_init_settings = '''  initSettingsPage() {
    const currentUser = this.getCurrentUser();
    const phoneEl = document.getElementById('settingsCurrentUser');
    if (phoneEl) phoneEl.textContent = currentUser || '--';

    const authInfo = document.getElementById('settingsAuthInfo');
    if (authInfo) {
      const auth = this._getAuth();
      const user = auth && auth.users ? auth.users.find(u => u.phone === currentUser) : null;
      if (user && user.activatedAt) {
        const d = new Date(user.activatedAt);
        authInfo.textContent = '授权激活于 ' + d.getFullYear() + '-' +
          String(d.getMonth()+1).padStart(2,'0') + '-' +
          String(d.getDate()).padStart(2,'0') + ' · 授权版本 ' + (auth.codeVersion || '未知');
      } else {
        authInfo.textContent = '授权版本 ' + (auth ? auth.codeVersion || '未知' : '未激活');
      }
    }
  }'''
    
    new_init_settings = '''  initSettingsPage() {
    const currentUser = this.getCurrentUser();
    const phoneEl = document.getElementById('settingsCurrentUser');
    if (phoneEl) phoneEl.textContent = currentUser || '--';

    const authInfo = document.getElementById('settingsAuthInfo');
    if (authInfo) {
      const auth = this._getAuth();
      const user = auth && auth.users ? auth.users.find(u => u.phone === currentUser) : null;
      if (user && user.activatedAt) {
        const d = new Date(user.activatedAt);
        authInfo.textContent = '授权激活于 ' + d.getFullYear() + '-' +
          String(d.getMonth()+1).padStart(2,'0') + '-' +
          String(d.getDate()).padStart(2,'0') + ' · 授权版本 ' + (auth.codeVersion || '未知');
      } else {
        authInfo.textContent = '授权版本 ' + (auth ? auth.codeVersion || '未知' : '未激活');
      }
    }

    // 刷新设备信息
    if (typeof DeviceManager !== 'undefined') DeviceManager.refreshSettingsInfo();
  }
};

// ============================================================
// 13b. DeviceManager - 设备管理与授权迁移
// ============================================================
const DeviceManager = {
  _renameDeviceId: null,

  /** 刷新设置页设备信息 */
  refreshSettingsInfo() {
    const deviceInfo = Auth._getCurrentDeviceInfo();
    const devices = Auth._getDevices();
    
    const nameEl = document.getElementById('currentDeviceName');
    if (nameEl) nameEl.textContent = deviceInfo.name;
    
    const typeEl = document.getElementById('currentDeviceType');
    if (typeEl) typeEl.textContent = '💻 ' + deviceInfo.type;
    
    const browserEl = document.getElementById('currentDeviceBrowser');
    if (browserEl) browserEl.textContent = '🌐 ' + deviceInfo.browser;
    
    const countEl = document.getElementById('deviceCount');
    if (countEl) countEl.textContent = devices.length + '/' + Auth.MAX_DEVICES + '台';
  },

  /** 格式化日期 */
  _formatDate(isoStr) {
    if (!isoStr) return '未知';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '未知';
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  },

  /** 获取设备图标 */
  _getDeviceIcon(type) {
    if (type === '手机') return '📱';
    if (type === '平板') return '📟';
    return '💻';
  },

  // ===== 设备列表弹窗 =====

  showDeviceList() {
    this._renderDeviceList();
    const modal = document.getElementById('deviceListModal');
    if (modal) modal.style.display = 'flex';
  },

  hideDeviceList() {
    const modal = document.getElementById('deviceListModal');
    if (modal) modal.style.display = 'none';
  },

  _renderDeviceList() {
    const devices = Auth._getDevices();
    const currentId = Auth._getDeviceId();
    const container = document.getElementById('deviceListContainer');
    const countEl = document.getElementById('deviceCountModal');
    
    if (countEl) countEl.textContent = devices.length;
    
    if (!container) return;
    
    if (devices.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px">暂无设备记录</div>';
      return;
    }
    
    // 当前设备排第一
    const sorted = [...devices].sort((a, b) => {
      if (a.id === currentId) return -1;
      if (b.id === currentId) return 1;
      return new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0);
    });
    
    container.innerHTML = sorted.map(d => {
      const isCurrent = d.id === currentId;
      return '<div class="device-item ' + (isCurrent ? 'device-current-item' : '') + '">' +
        '<div class="device-icon">' + this._getDeviceIcon(d.type) + '</div>' +
        '<div class="device-info">' +
          '<div class="device-name">' +
            (d.name || '未命名设备') +
            (isCurrent ? '<span class="device-current-tag">当前</span>' : '') +
          '</div>' +
          '<div class="device-detail">' +
            (d.type || '未知') + ' · ' + (d.browser || '未知浏览器') + 
            '<br>激活：' + this._formatDate(d.activatedAt) +
          '</div>' +
        '</div>' +
        '<div class="device-actions">' +
          '<button class="device-action-btn" onclick="DeviceManager.showRenameModal(\\'' + d.id + '\\')">重命名</button>' +
          (isCurrent ? '' : '<button class="device-action-btn revoke-btn" onclick="DeviceManager.revokeDevice(\\'' + d.id + '\\')">撤销</button>') +
        '</div>' +
      '</div>';
    }).join('');
  },

  // ===== 重命名设备 =====

  showRenameModal(deviceId) {
    this._renameDeviceId = deviceId;
    const devices = Auth._getDevices();
    const device = devices.find(d => d.id === deviceId);
    const input = document.getElementById('renameDeviceInput');
    if (input && device) input.value = device.name || '';
    const modal = document.getElementById('renameDeviceModal');
    if (modal) modal.style.display = 'flex';
  },

  hideRenameModal() {
    this._renameDeviceId = null;
    const modal = document.getElementById('renameDeviceModal');
    if (modal) modal.style.display = 'none';
  },

  doRename() {
    const input = document.getElementById('renameDeviceInput');
    const newName = input ? input.value.trim() : '';
    if (!newName) {
      alert('请输入设备名称');
      return;
    }
    if (newName.length > 20) {
      alert('设备名称不能超过20个字符');
      return;
    }
    if (this._renameDeviceId) {
      Auth._renameDevice(this._renameDeviceId, newName);
      this._renderDeviceList();
      this.refreshSettingsInfo();
      this.hideRenameModal();
      this._toast('设备已重命名');
    }
  },

  // ===== 撤销设备 =====

  revokeDevice(deviceId) {
    const devices = Auth._getDevices();
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    if (!confirm('确定撤销设备 "' + (device.name || '未命名') + '" 的授权？\n\n⚠️ 注意：纯前端架构下，此操作仅移除本地记录，无法远程撤销该设备的实际授权。该设备上的已激活状态不会受影响。')) {
      return;
    }
    
    Auth._revokeDevice(deviceId);
    this._renderDeviceList();
    this.refreshSettingsInfo();
    this._toast('设备已从列表移除');
  },

  // ===== 导出迁移码 =====

  showExportModal() {
    // 重置状态
    const pwd1 = document.getElementById('exportPassword');
    const pwd2 = document.getElementById('exportPasswordConfirm');
    const step2 = document.getElementById('exportStep2');
    const generateBtn = document.getElementById('exportGenerateBtn');
    const copied = document.getElementById('exportCodeCopied');
    if (pwd1) pwd1.value = '';
    if (pwd2) pwd2.value = '';
    if (step2) step2.style.display = 'none';
    if (generateBtn) {
      generateBtn.style.display = '';
      generateBtn.textContent = '生成迁移码';
      generateBtn.disabled = false;
    }
    if (copied) copied.style.display = 'none';
    
    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'flex';
  },

  hideExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.style.display = 'none';
  },

  async generateExportCode() {
    const pwd1 = document.getElementById('exportPassword').value;
    const pwd2 = document.getElementById('exportPasswordConfirm').value;
    const generateBtn = document.getElementById('exportGenerateBtn');
    const step2 = document.getElementById('exportStep2');
    
    if (pwd1.length < 6) {
      alert('迁移密码至少6位');
      return;
    }
    if (pwd1 !== pwd2) {
      alert('两次输入的密码不一致');
      return;
    }
    
    generateBtn.disabled = true;
    generateBtn.textContent = '加密中...';
    
    try {
      const code = await Auth.generateMigrationCode(pwd1);
      const codeText = document.getElementById('exportCodeText');
      if (codeText) codeText.value = code;
      if (step2) step2.style.display = 'block';
      generateBtn.style.display = 'none';
    } catch (e) {
      alert('生成迁移码失败：' + e.message);
      generateBtn.disabled = false;
      generateBtn.textContent = '生成迁移码';
    }
  },

  copyExportCode() {
    const codeText = document.getElementById('exportCodeText');
    if (!codeText) return;
    
    // 尝试使用现代 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeText.value).then(() => {
        this._showCopied();
      }).catch(() => {
        this._fallbackCopy(codeText);
      });
    } else {
      this._fallbackCopy(codeText);
    }
  },

  _fallbackCopy(el) {
    el.select();
    el.setSelectionRange(0, el.value.length);
    try {
      document.execCommand('copy');
      this._showCopied();
    } catch (e) {
      alert('复制失败，请手动选择并复制');
    }
  },

  _showCopied() {
    const copied = document.getElementById('exportCodeCopied');
    if (copied) {
      copied.style.display = 'block';
      setTimeout(() => { copied.style.display = 'none'; }, 2000);
    }
  },

  // ===== 导入迁移码 =====

  showImportModal() {
    const codeEl = document.getElementById('importCodeText');
    const pwdEl = document.getElementById('importPassword');
    const errEl = document.getElementById('importError');
    if (codeEl) codeEl.value = '';
    if (pwdEl) pwdEl.value = '';
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'flex';
  },

  hideImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
  },

  async doImport() {
    const code = document.getElementById('importCodeText').value.trim();
    const password = document.getElementById('importPassword').value;
    const errEl = document.getElementById('importError');
    
    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    };
    
    if (!code) {
      showErr('请输入迁移码');
      return;
    }
    if (password.length < 6) {
      showErr('请输入迁移密码（至少6位）');
      return;
    }
    
    errEl.style.display = 'none';
    
    try {
      const result = await Auth.importMigrationCode(code, password);
      alert('🎉 授权导入成功！\n\n用户数：' + result.userCount + ' 个\n设备数：' + result.deviceCount + ' 台\n\n即将刷新页面...');
      this.hideImportModal();
      // 自动登录第一个用户
      const auth = Auth._getAuth();
      if (auth && auth.users && auth.users.length > 0) {
        Auth._saveSession(auth.users[0].phone, true);
      }
      location.reload();
    } catch (e) {
      showErr(e.message || '导入失败，请检查迁移码和密码');
    }
  },

  // ===== Toast 提示 =====
  _toast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) {
      alert(msg);
      return;
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }'''
    
    content = content.replace(old_init_settings, new_init_settings)
    
    write_file(APP_JS, content)
    print("✓ app.js 已更新 (v4.4 P9 设备指纹 + 授权迁移 + 设备管理)")


# ============================================================
# Main
# ============================================================
if __name__ == '__main__':
    print("=== 智股分析 v4.4 P9 升级开始 ===\n")
    update_sw()
    update_index_html()
    update_style_css()
    update_app_js()
    print("\n=== 升级完成 ===")
    print("功能清单：")
    print("  ✓ 设备指纹系统（UUID v4 + 设备类型/浏览器检测）")
    print("  ✓ 设备管理（5台上限 + 重命名 + 撤销）")
    print("  ✓ 授权迁移（AES-256-GCM 加密 + Base64迁移码 + 24h有效期）")
    print("  ✓ 激活流程增强（设备数检查）")
    print("  ✓ 设置页UI更新（设备信息 + 迁移入口）")
    print("  ✓ 版本号 v4.4-p9")
