/**
 * v5.10 验证脚本
 * - 使用 vm 加载 app.js，mock document/window/localStorage
 * - setTimeout 使用真实实现（不压缩），否则 AbortController 会立即 abort
 * - 末尾追加 globalThis.__E 提取关键对象
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const APP_PATH = '/Coze/Drive/扣子/所有对话/主对话/智股分析/app.js';

// 读取 app.js 源码
let src = fs.readFileSync(APP_PATH, 'utf8');

// 追加提取语句
src += '\n;globalThis.__E={CONFIG,DataAPI,ReportCalendar,SelfCheck};\n';

// localStorage mock
const _store = {};
const localStorageMock = {
  getItem(k) { return _store[k] !== undefined ? _store[k] : null; },
  setItem(k, v) { _store[k] = String(v); },
  removeItem(k) { delete _store[k]; },
  clear() { Object.keys(_store).forEach(k => delete _store[k]); }
};

// AbortController: Node 18+ has it globally, but ensure it's available
if (typeof globalThis.AbortController === 'undefined') {
  // polyfill not needed in Node 18+
}

// document mock (for _jsonp and other DOM operations)
const _scripts = [];
const documentMock = {
  createElement(tag) {
    if (tag === 'script') {
      const el = {
        _src: '',
        _onload: null,
        _onerror: null,
        parentNode: { removeChild(child) {} },
        set src(v) {
          this._src = v;
          _scripts.push(v);
          setTimeout(() => {
            if (el._onerror) el._onerror(new Error('Script load not supported in Node vm'));
          }, 100);
        },
        get src() { return this._src; },
        set onload(fn) { this._onload = fn; },
        get onload() { return this._onload; },
        set onerror(fn) { this._onerror = fn; },
        get onerror() { return this._onerror; }
      };
      return el;
    }
    return { style: {}, appendChild() {}, removeChild() {}, innerHTML: '' };
  },
  head: { appendChild(el) {} },
  body: { appendChild(el) {}, removeChild(el) {} },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createEvent() { return { initEvent() {} }; },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
  documentElement: { style: {} },
  cookie: '',
  readyState: 'complete'
};

// window mock
const windowMock = {
  addEventListener() {},
  removeEventListener() {},
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  location: { href: 'https://test.local' },
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  localStorage: localStorageMock,
  fetch: globalThis.fetch,
  AbortController: globalThis.AbortController
};

// 创建沙箱上下文
const sandbox = {
  console,
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  setInterval: globalThis.setInterval.bind(globalThis),
  clearInterval: globalThis.clearInterval.bind(globalThis),
  Date,
  Promise,
  Error,
  JSON,
  Math,
  Object,
  Array,
  String,
  Number,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  RegExp,
  Map,
  Set,
  TypeError,
  RangeError,
  SyntaxError,
  document: documentMock,
  window: windowMock,
  globalThis: windowMock,
  localStorage: localStorageMock,
  fetch: globalThis.fetch.bind(globalThis),
  AbortController: globalThis.AbortController,
  TextDecoder: globalThis.TextDecoder,
  Uint8Array: globalThis.Uint8Array,
  ArrayBuffer: globalThis.ArrayBuffer,
  navigator: windowMock.navigator,
  location: windowMock.location
};

// 让 window 和 globalThis 指向沙箱本身（自引用）
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

console.log('=== 加载 app.js 到 vm 沙箱 ===');
try {
  vm.runInContext(src, context, { timeout: 30000, filename: 'app.js' });
  console.log('✅ app.js 加载成功');
} catch (e) {
  console.error('❌ app.js 加载失败:', e.message);
  process.exit(1);
}

const { CONFIG, DataAPI, ReportCalendar, SelfCheck } = sandbox.__E;

// === 重写 _jsonp 方法：在 Node 环境中用 fetch 替代 script 标签加载 ===
// 新浪行业列表返回 GBK 编码的 JS 赋值语句，需要：
// 1. fetch 获取 ArrayBuffer
// 2. GBK 解码（使用 TextDecoder）
// 3. eval 执行赋值语句来设置全局变量
// 4. 读取全局变量值
const _vm = require('vm');
const _originalJsonp = DataAPI._jsonp.bind(DataAPI);
DataAPI._jsonp = async function(url, globalVar, timeout) {
  console.log('[_jsonp Node override] 请求:', url.substring(0, 80) + '...');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 10000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const buffer = await resp.arrayBuffer();
    
    // GBK 解码（newSinaHy.php 返回 GBK 编码）
    let text;
    try {
      const decoder = new TextDecoder('gbk');
      text = decoder.decode(new Uint8Array(buffer));
    } catch(e) {
      // fallback: UTF-8
      console.warn('[gbk decode failed, fallback utf-8]');
      text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    }
    
    // 执行 JS 赋值语句（设置 sandbox 中的全局变量）
    // 格式: var S_Finance_bankuai_sinaindustry = {...}
    // 去掉 "var " 前缀，直接执行赋值
    const cleanCode = text.trim().replace(/^var\s+/m, '');
    _vm.runInContext('var ' + globalVar + ' = ' + cleanCode.split('=').slice(1).join('=').trim().replace(/;\s*$/, ''), context, { timeout: 5000 });
    
    // 读取设置的全局变量
    const value = sandbox[globalVar];
    // 清理
    delete sandbox[globalVar];
    
    if (value) {
      console.log('[_jsonp Node override] 成功，变量:', globalVar, '类型:', typeof value, 'keys:', Object.keys(value).length);
      return value;
    }
    throw new Error('变量 ' + globalVar + ' 未设置');
  } catch(e) {
    console.warn('[_jsonp Node override] 失败:', e.message);
    throw e;
  }
};

async function runTests() {
  console.log('\n========================================');
  console.log('=== v5.10 验证测试 ===');
  console.log('========================================');

  // 1. 验证 CONFIG.VERSION
  console.log('\n--- 测试 1: CONFIG.VERSION ---');
  console.log('CONFIG.VERSION =', CONFIG.VERSION);
  if (CONFIG.VERSION === 'v5.10') {
    console.log('✅ 版本号正确');
  } else {
    console.log('❌ 版本号不是 v5.10');
  }

  // 2. 测试 fetchSinaIndustryList
  console.log('\n--- 测试 2: DataAPI.fetchSinaIndustryList() ---');
  try {
    const industries = await DataAPI.fetchSinaIndustryList();
    console.log('返回行业数量:', industries.length);
    if (industries.length >= 40) {
      console.log('✅ 行业数量 >= 40');
    } else {
      console.log('❌ 行业数量不足40，实际:', industries.length);
    }
    console.log('前5个行业:');
    industries.slice(0, 5).forEach((ind, i) => {
      console.log(`  ${i+1}. ${ind.name} (${ind.code}) 涨跌幅:${ind.changePct}% 成交额:${(ind.amount/1e8).toFixed(1)}亿 领涨:${ind.leaderName} ${ind.leaderChangePct}%`);
    });
  } catch (e) {
    console.log('❌ fetchSinaIndustryList 失败:', e.message);
  }

  // 3. 测试 fetchStockIndustry('sh600519') - 贵州茅台
  console.log('\n--- 测试 3: DataAPI.fetchStockIndustry("sh600519") - 贵州茅台 ---');
  try {
    const ind1 = await DataAPI.fetchStockIndustry('sh600519');
    console.log('结果:', JSON.stringify(ind1, null, 2));
    if (ind1 && ind1.name) {
      console.log('✅ 返回行业名:', ind1.name, '(来源:', ind1.from + ')');
    } else {
      console.log('❌ 未返回行业名');
    }
  } catch (e) {
    console.log('❌ fetchStockIndustry sh600519 失败:', e.message);
  }

  // 4. 测试 fetchStockIndustry('sz300308') - 中际旭创
  console.log('\n--- 测试 4: DataAPI.fetchStockIndustry("sz300308") - 中际旭创 ---');
  try {
    const ind2 = await DataAPI.fetchStockIndustry('sz300308');
    console.log('结果:', JSON.stringify(ind2, null, 2));
    if (ind2 && ind2.name) {
      console.log('✅ 返回行业名:', ind2.name, '(来源:', ind2.from + ')');
    } else {
      console.log('❌ 未返回行业名（可能因本地映射无此股票且遍历未完成）');
    }
  } catch (e) {
    console.log('❌ fetchStockIndustry sz300308 失败:', e.message);
  }

  // 5. 测试 fetchKline('sh600519', 60)
  console.log('\n--- 测试 5: DataAPI.fetchKline("sh600519", 60) ---');
  try {
    const klines = await DataAPI.fetchKline('sh600519', 60);
    console.log('返回K线数量:', klines.length);
    if (klines.length === 60) {
      console.log('✅ K线数量 = 60');
    } else {
      console.log('⚠️ K线数量 =', klines.length, '(期望60)');
    }
    if (klines.length > 0) {
      const last = klines[klines.length - 1];
      console.log('最后一条日期:', last.date);
      if (last.date === '2026-11-02' || last.date === '2026-11-03') {
        console.log('✅ 最后日期正确');
      } else {
        console.log('⚠️ 最后日期:', last.date, '(期望 2026-11-02 或 2026-11-03)');
      }
      console.log('最后3条:', klines.slice(-3).map(k => `${k.date} O:${k.open} C:${k.close} H:${k.high} L:${k.low}`));
    }
  } catch (e) {
    console.log('❌ fetchKline 失败:', e.message);
  }

  // 6. 测试 ReportCalendar.getStatus(new Date())
  console.log('\n--- 测试 6: ReportCalendar.getStatus(new Date()) ---');
  try {
    const now = new Date();
    console.log('当前日期:', now.toISOString().split('T')[0]);
    const calStatus = ReportCalendar.getStatus(now);
    console.log('完整返回对象:', JSON.stringify(calStatus, null, 2));
    
    // 验证结构完整性
    const requiredFields = ['phase', 'startDate', 'endDate', 'daysLeft', 'isInWindow', 'nextReport', 'nextWindowStart', 'daysToNext'];
    const missingFields = requiredFields.filter(f => calStatus[f] === undefined);
    if (missingFields.length === 0) {
      console.log('✅ 返回结构完整');
    } else {
      console.log('❌ 缺少字段:', missingFields.join(', '));
    }
    
    if (typeof calStatus.daysLeft === 'number' && calStatus.daysLeft >= 0) {
      console.log('✅ daysLeft 为正整数或0:', calStatus.daysLeft);
    } else {
      console.log('❌ daysLeft 无效:', calStatus.daysLeft);
    }
    
    if (typeof calStatus.daysToNext === 'number' && calStatus.daysToNext >= 0) {
      console.log('✅ daysToNext 为正整数或0:', calStatus.daysToNext);
    } else {
      console.log('❌ daysToNext 无效:', calStatus.daysToNext);
    }

    // 测试其他日期
    console.log('\n--- 测试6b: 不同日期的日历状态 ---');
    const testDates = [
      new Date('2026-03-15'),  // 年报披露期内
      new Date('2026-04-15'),  // 年报+一季报重叠期
      new Date('2026-07-15'),  // 半年报披露期内
      new Date('2026-10-15'),  // 三季报披露期内
      new Date('2026-06-15'),  // 空窗期
      new Date('2026-12-20'),  // 空窗期（年末）
    ];
    for (const d of testDates) {
      const s = ReportCalendar.getStatus(d);
      const dateStr = d.toISOString().split('T')[0];
      if (s.isInWindow) {
        console.log(`  ${dateStr}: ${s.phase} (${s.startDate}~${s.endDate}) 剩${s.daysLeft}天${s.alsoIn ? ' 同处'+s.alsoIn : ''}`);
      } else {
        console.log(`  ${dateStr}: ${s.phase} → 下一:${s.nextReport}(${s.nextWindowStart}起 还有${s.daysToNext}天)`);
      }
    }
  } catch (e) {
    console.log('❌ ReportCalendar 失败:', e.message);
  }

  // 7. 模拟 _enhanceModule2 数据获取路径（不渲染DOM）
  console.log('\n--- 测试 7: 模拟 _enhanceModule2 数据获取路径 ---');
  try {
    // 模拟新浪数据获取
    const sinaIndustries = await DataAPI.fetchSinaIndustryList();
    if (sinaIndustries.length > 0) {
      const allSectors = sinaIndustries.map((s, idx) => ({
        code: s.code,
        name: s.name,
        changePct: s.changePct,
        mainFlow: 0,
        turnoverPct: 0,
        upCount: 0,
        downCount: 0,
        stockCount: s.stockCount || 0,
        amount: s.amount || 0,
        leaderCode: s.leaderCode || '',
        leaderName: s.leaderName || '',
        leaderChangePct: s.leaderChangePct || 0,
        _sinaRank: idx + 1,
        _fromSina: true
      }));
      const topSectors = allSectors.slice(0, 50);
      console.log('✅ allSectors.length =', allSectors.length, '> 0');
      console.log('✅ topSectors.length =', topSectors.length);
      
      // 模拟匹配茅台的行业
      const industryName = '白酒'; // CONFIG.SECTORS['sh600519'].name
      let matchedSector = null;
      let sectorRank = -1;
      for (let i = 0; i < allSectors.length; i++) {
        if (allSectors[i].name.indexOf(industryName) >= 0 || industryName.indexOf(allSectors[i].name) >= 0) {
          matchedSector = allSectors[i];
          sectorRank = i + 1;
          break;
        }
      }
      if (matchedSector) {
        console.log('✅ 精确匹配到茅台行业:', matchedSector.name, '排名:', sectorRank, '涨幅:', matchedSector.changePct + '%');
      } else {
        // v5.10: 先尝试别名映射
        const _nameAlias = {
          '白酒': '酿酒行业', '券商': '证券行业', '乳制品': '食品行业',
          '石油石化': '石油行业', '煤化工': '化工行业', '锂矿': '矿产行业',
          '消费电子': '电子器件', '互联网金融': '电子信息'
        };
        const aliasName = _nameAlias[industryName];
        if (aliasName) {
          for (let i = 0; i < allSectors.length; i++) {
            if (allSectors[i].name === aliasName || allSectors[i].name.indexOf(aliasName) >= 0) {
              matchedSector = allSectors[i];
              sectorRank = i + 1;
              break;
            }
          }
        }
        if (matchedSector) {
          console.log('✅ 别名映射匹配到:', matchedSector.name, '排名:', sectorRank, '涨幅:', matchedSector.changePct + '%');
        } else {
          // 最后按类型推断 + 名称相似度
          const sectorType = '消费'; // CONFIG.SECTORS['sh600519'].type
          const consumeKW = ['白酒','酿酒','食品','饮料','家电','服装','纺织','零售','百货','超市','餐饮','旅游','酒店','美容','化妆品','日用品','消费品'];
          let bestCandidate = null;
          let bestRank = -1;
          let bestSimilarity = 0;
          for (let i = 0; i < allSectors.length; i++) {
            const sName = allSectors[i].name;
            let inferred = '服务';
            for (const kw of consumeKW) { if (sName.indexOf(kw) >= 0) { inferred = '消费'; break; } }
            if (inferred === sectorType) {
              let sim = 0;
              for (const ch of industryName) { if (sName.indexOf(ch) >= 0) sim++; }
              if (!bestCandidate || sim > bestSimilarity) {
                bestCandidate = allSectors[i];
                bestRank = i + 1;
                bestSimilarity = sim;
              }
            }
          }
          if (bestCandidate) {
            matchedSector = bestCandidate;
            sectorRank = bestRank;
            console.log('⚠️ 类型推断+相似度匹配到:', matchedSector.name, '排名:', sectorRank, '涨幅:', matchedSector.changePct + '%');
          } else {
            console.log('❌ 未匹配到行业');
          }
        }
      }
    } else {
      console.log('❌ 新浪行业列表为空，无法模拟数据获取路径');
    }
  } catch (e) {
    console.log('❌ 模拟 _enhanceModule2 数据路径失败:', e.message);
  }

  console.log('\n========================================');
  console.log('=== 验证测试完成 ===');
  console.log('========================================');
}

runTests().catch(e => {
  console.error('测试运行异常:', e);
  process.exit(1);
});
