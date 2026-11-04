// v5.12 搜索功能验证脚本
const fs = require('fs');
const vm = require('vm');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ===== Mock DOM environment =====
const mockElements = {};
const mockDocument = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false },
    setAttribute: ()=>{},
    appendChild: ()=>{},
    removeChild: ()=>{},
    parentNode: null,
    onload: null,
    onerror: null,
    src: '',
    innerHTML: '',
    textContent: ''
  }),
  head: { appendChild: ()=>{}, removeChild: ()=>{} },
  getElementById: (id) => mockElements[id] || { textContent: '', classList: { add: ()=>{}, remove: ()=>{} }, style: {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { appendChild: ()=>{} },
  addEventListener: ()=>{},
  removeEventListener: ()=>{}
};

const mockWindow = {
  addEventListener: ()=>{},
  removeEventListener: ()=>{},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  location: { href: 'http://localhost', protocol: 'https:' },
  navigator: { clipboard: { writeText: async()=>{} }, userAgent: 'Node' },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  fetch: globalThis.fetch,
  AbortController: globalThis.AbortController,
  TextDecoder: globalThis.TextDecoder,
  Array: Array,
  Set: Set,
  Map: Map,
  Promise: Promise,
  Date: Date,
  console: console,
  JSON: JSON,
  Math: Math,
  Number: Number,
  String: String,
  RegExp: RegExp,
  Error: Error,
  parseInt: parseInt,
  parseFloat: parseFloat,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  Object: Object
};

// ===== HTTP fetch helper (for Node) =====
function httpFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', ...options.headers }
    };
    const req = mod.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
          text: async () => buffer.toString('utf-8'),
          json: async () => JSON.parse(buffer.toString('utf-8'))
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ===== Override JSONP methods to use fetch + GBK decode =====
function installJsonpMocks(sandbox) {
  // _jsonp: fetch URL, decode GBK, extract window[globalVar] value
  sandbox.DataAPI._jsonp = async function(url, globalVar, timeout) {
    const resp = await httpFetch(url);
    const buf = await resp.arrayBuffer();
    // GBK decode
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(new Uint8Array(buf));
    // Extract: var suggestvalue="...";
    const match = text.match(/var\s+\w+\s*=\s*"([^"]*)"/);
    return match ? match[1] : '';
  };

  // _jsonpCallback: fetch URL, decode GBK, extract JSON from callback(data)
  sandbox.DataAPI._jsonpCallback = async function(url, cbName, timeout) {
    const resp = await httpFetch(url);
    const text = await resp.text();
    // Extract: cbName({...})
    const match = text.match(new RegExp(cbName + '\\s*\\((.+)\\)\\s*;?\\s*$'));
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('JSONP callback parse failed');
  };
}

async function main() {
  // Read app.js
  let appCode = fs.readFileSync('/Coze/Drive/扣子/所有对话/主对话/智股分析/app.js', 'utf-8');
  // Append export line
  appCode += '\n;globalThis.__E={CONFIG,DataAPI,Utils,STOCK_MAP,CODE_TO_NAME};';

  const sandbox = {
    ...mockWindow,
    document: mockDocument,
    globalThis: {},
    self: {}
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(appCode, context, { timeout: 30000 });

  // Access exports from the sandbox context
  const exports = sandbox.__E;
  if (!exports || !exports.DataAPI) {
    console.error('FATAL: __E not found in sandbox. Keys:', Object.keys(sandbox).filter(k => k.startsWith('__')));
    process.exit(1);
  }
  const { CONFIG, DataAPI, Utils, STOCK_MAP, CODE_TO_NAME } = exports;

  // Install JSONP mocks (on the DataAPI object inside the sandbox context)
  DataAPI._jsonp = async function(url, globalVar, timeout) {
    const resp = await httpFetch(url);
    const buf = await resp.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(new Uint8Array(buf));
    const match = text.match(/var\s+\w+\s*=\s*"([^"]*)"/);
    return match ? match[1] : '';
  };

  DataAPI._jsonpCallback = async function(url, cbName, timeout) {
    const resp = await httpFetch(url);
    const text = await resp.text();
    const match = text.match(new RegExp(cbName + '\\s*\\((.+)\\)\\s*;?\\s*$'));
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('JSONP callback parse failed');
  };

  console.log('=== v5.12 搜索功能验证 ===');
  console.log('CONFIG.VERSION:', CONFIG.VERSION);
  console.log('CONFIG.SINA_SUGGEST:', CONFIG.SINA_SUGGEST);
  console.log('');

  // Test 1: searchStock('力王股份')
  console.log('--- Test 1: searchStock("力王股份") ---');
  try {
    const r1 = await DataAPI.searchStock('力王股份');
    console.log(`结果数: ${r1.length}`);
    r1.slice(0, 3).forEach(r => console.log(`  ${r.fullName} market=${r.market} fullCode=${r.fullCode}`));
    const hasBj920627 = r1.some(r => r.fullCode === 'bj920627');
    console.log(`包含 bj920627: ${hasBj920627 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 2: searchStock('920627')
  console.log('--- Test 2: searchStock("920627") ---');
  try {
    const r2 = await DataAPI.searchStock('920627');
    console.log(`结果数: ${r2.length}`);
    r2.slice(0, 3).forEach(r => console.log(`  ${r.fullName} market=${r.market} fullCode=${r.fullCode}`));
    const hasBj920627 = r2.some(r => r.fullCode === 'bj920627');
    console.log(`包含 bj920627: ${hasBj920627 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 3: searchStock('lwgf')
  console.log('--- Test 3: searchStock("lwgf") ---');
  try {
    const r3 = await DataAPI.searchStock('lwgf');
    console.log(`结果数: ${r3.length}`);
    r3.slice(0, 3).forEach(r => console.log(`  ${r.fullName} market=${r.market} fullCode=${r.fullCode}`));
    const hasBj920627 = r3.some(r => r.fullCode === 'bj920627');
    console.log(`包含 bj920627: ${hasBj920627 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 4: searchStock('茅台')
  console.log('--- Test 4: searchStock("茅台") ---');
  try {
    const r4 = await DataAPI.searchStock('茅台');
    console.log(`结果数: ${r4.length}`);
    r4.slice(0, 3).forEach(r => console.log(`  ${r.fullName} market=${r.market} fullCode=${r.fullCode}`));
    const hasSh600519 = r4.some(r => r.fullCode === 'sh600519');
    console.log(`包含 sh600519: ${hasSh600519 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 5: searchStock('宁德时代')
  console.log('--- Test 5: searchStock("宁德时代") ---');
  try {
    const r5 = await DataAPI.searchStock('宁德时代');
    console.log(`结果数: ${r5.length}`);
    r5.slice(0, 3).forEach(r => console.log(`  ${r.fullName} market=${r.market} fullCode=${r.fullCode}`));
    const hasSz300750 = r5.some(r => r.fullCode === 'sz300750');
    console.log(`包含 sz300750: ${hasSz300750 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 6: searchStockFull('力王股份')
  console.log('--- Test 6: searchStockFull("力王股份") ---');
  try {
    const r6 = await DataAPI.searchStockFull('力王股份');
    console.log(`结果数: ${r6.length}`);
    r6.slice(0, 5).forEach(r => console.log(`  ${r.name} code=${r.code} fullCode=${r.fullCode} market=${r.market}`));
    const hasBj920627 = r6.some(r => r.fullCode === 'bj920627');
    console.log(`包含 bj920627: ${hasBj920627 ? 'PASS ✅' : 'FAIL ❌'}`);
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // Test 7: fetchQuote('bj920627')
  console.log('--- Test 7: fetchQuote("bj920627") ---');
  try {
    const q = await DataAPI.fetchQuote('bj920627');
    if (q) {
      console.log(`name=${q.name}, price=${q.price}`);
      console.log(`name=力王股份: ${q.name === '力王股份' ? 'PASS ✅' : 'FAIL ❌'}`);
      console.log(`price>0: ${q.price > 0 ? 'PASS ✅' : 'FAIL ❌'}`);
    } else {
      console.log('返回null: FAIL ❌');
    }
  } catch(e) { console.log('ERROR:', e.message); }
  console.log('');

  // STOCK_MAP 脏数据修正对照表
  console.log('=== STOCK_MAP 脏数据修正对照表 ===');
  const corrections = [
    ['凯德石英', 'bj835185', 'bj920179'],
    ['贝特瑞', 'bj835185', 'bj920185'],
    ['富士达', 'bj835640', 'bj920640'],
    ['志晟信息', 'bj835640', 'bj920171'],
    ['诺思兰德', 'bj430047', 'bj920047'],
    ['同辉信息', 'bj430047', 'bj920090'],
    ['吉林敖东', 'bj000776', 'sz000623'],
    ['恒光股份', 'bj301118', 'sz301118'],
    ['中航机电', 'bj833171', 'sz002013'],
    ['鑫磊股份', 'bj301317', 'sz301317'],
    ['长虹美菱', 'bj200832', 'sz000521'],
    ['艾融软件(dup)', 'bj830799×2', 'bj920799(去重)'],
    ['每日互动', 'bj832727', 'sz300766'],
    ['利君股份', 'bj430030', 'sz002651'],
    ['虹安电子', 'bj832566', 'bj920566(梓橦宫)'],
  ];
  console.log('条目 | 旧值 | 实测新值');
  console.log('---|---|---');
  corrections.forEach(([name, old, nw]) => {
    const actual = STOCK_MAP[name] || '(未找到)';
    console.log(`${name} | ${old} | ${nw} → 实际=${actual} ${actual === nw.split('(')[0].split('×')[0] ? '✅' : '⚠️'}`);
  });

  console.log('\n=== 验证完成 ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
