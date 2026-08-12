/**
 * 智股分析 v2.0 - A股七维度智能分析系统
 * 纯前端JavaScript，零Token消耗，不调用任何LLM API
 * 
 * 模块结构：
 * 1. CONFIG - 配置常量
 * 2. STOCK_MAP - 股票名称映射表（含ST股）
 * 3. Utils - 工具函数（编码转换、格式化）
 * 4. DataAPI - 数据获取API
 * 5. Navigation - 页面导航
 * 6. Market - 全球市场
 * 7. Search - 股票搜索
 * 8. SevenDimAnalyzer - 七维度评分
 * 9. DiagnosticEngine - 持仓诊断8大模块
 * 10. Screener - 智能选股
 * 11. Watchlist - 自选股管理
 * 12. App - 主入口
 */

// ============================================================
// 1. CONFIG - 全局配置
// ============================================================
const CONFIG = {
  // 腾讯实时行情API（GBK编码，需转换）
  TENCENT_QUOTE: 'https://qt.gtimg.cn/q=',
  // 腾讯日K线API（JSON格式）
  TENCENT_KLINE: 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get',
  // 东方财富搜索API
  EM_SEARCH: 'https://searchapi.eastmoney.com/api/suggest/get',
  // 东方财富资金流向API
  EM_CAPITAL: 'https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get',
  // 东方财富财务数据API
  EM_FINANCE: 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get',
  // 东方财富实时行情API（北交所备用）
  EM_QUOTE: 'https://push2.eastmoney.com/api/qt/stock/get',
  // 东方财富公告API
  EM_NEWS: 'https://np-anotice-stock.eastmoney.com/api/security/ann',
  // 全球市场指数代码
  GLOBAL_INDICES: [
    { code: 'us.IXIC', name: '纳斯达克' },
    { code: 'us.DJI', name: '道琼斯' },
    { code: 'us.INX', name: '标普500' },
    { code: 'hk.HSI', name: '恒生指数' },
    { code: 'hk.HSCEI', name: '国企指数' },
    { code: 'hk.HSTECH', name: '恒生科技' },
    { code: 'us.DJIA', name: '道琼斯工业' },
    { code: 'b_81.N225', name: '日经225' },
    { code: 'b_81.KOSPI', name: '韩国KOSPI' },
    { code: 'b_81.FTSE', name: '英国富时' },
    { code: 'b_81.DAX', name: '德国DAX' },
    { code: 'b_81.GDAXI', name: '法国CAC' }
  ],
  // 热门股票池（用于Top20和选股）
  HOT_STOCKS: [
    'sh600519','sh601318','sz000858','sh600036','sz000333',
    'sh601166','sz002594','sh600900','sh601888','sh600276',
    'sz000651','sh601398','sh601288','sh600030','sh601012',
    'sh600585','sz002714','sh603259','sh601899','sz002475',
    'sh600887','sz000568','sh601857','sh600028','sh601398',
    'sh601628','sz002304','sh600309','sz002352','sh603288',
    'sz300750','sh688981','sz002415','sh601225','sh600104',
    'sz000725','sh601919','sh600690','sz002230','sh601688'
  ],
  // 选股股票池（更大范围）
  SCREENER_POOL: [
    'sh600519','sh601318','sz000858','sh600036','sz000333',
    'sh601166','sz002594','sh600900','sh601888','sh600276',
    'sz000651','sh601398','sh601288','sh600030','sh601012',
    'sh600585','sz002714','sh603259','sh601899','sz002475',
    'sh600887','sz000568','sh601857','sh600028','sh601628',
    'sz002304','sh600309','sz002352','sh603288','sz300750',
    'sh688981','sz002415','sh601225','sh600104','sz000725',
    'sh601919','sh600690','sz002230','sh601688','sh601601',
    'sz002142','sh600000','sz000001','sz000002','sh601668',
    'sh600048','sz002271','sh601877','sz002049','sh600763',
    'sz300015','sh600436','sz002007','sh603517','sz300059',
    'sh600660','sz002607','sh601816','sz300760','sh688012',
    'sz002032','sh600346','sh601238','sz002938','sh600183',
    'sz000100','sh601111','sh600031','sz002241','sh600745',
    'sz300124','sh600588','sz002050','sh601633','sz002841',
    'sh600406','sz300274','sh600703','sz002601','sh600741'
  ],
  // 宏观数据（固定值，免费API无法获取实时宏观数据）
  MACRO_DATA: {
    lpr_1y: 3.10, lpr_5y: 3.60,
    cpi: 0.3, ppi: -2.5,
    pmi: 49.1, gdp: 5.2,
    m2: 7.0, social_finance: 9.5
  },
  // 行业分类（简化版，用于诊断）
  SECTORS: {
    'sh600519': { name: '白酒', type: '消费' },
    'sz000858': { name: '白酒', type: '消费' },
    'sz000568': { name: '白酒', type: '消费' },
    'sh601318': { name: '保险', type: '金融' },
    'sh600036': { name: '银行', type: '金融' },
    'sh601166': { name: '银行', type: '金融' },
    'sh601398': { name: '银行', type: '金融' },
    'sh601288': { name: '银行', type: '金融' },
    'sh600030': { name: '券商', type: '金融' },
    'sh601688': { name: '券商', type: '金融' },
    'sz000333': { name: '家电', type: '消费' },
    'sz000651': { name: '家电', type: '消费' },
    'sz002594': { name: '新能源汽车', type: '科技' },
    'sz300750': { name: '锂电池', type: '新能源' },
    'sh601888': { name: '旅游', type: '消费' },
    'sh600276': { name: '医药', type: '医疗' },
    'sh600887': { name: '乳制品', type: '消费' },
    'sh601857': { name: '石油石化', type: '能源' },
    'sh600028': { name: '石油石化', type: '能源' },
    'sh601628': { name: '保险', type: '金融' },
    'sz002475': { name: '消费电子', type: '科技' },
    'sh688981': { name: '半导体', type: '科技' },
    'sz002415': { name: '安防', type: '科技' },
    'sh601899': { name: '有色金属', type: '周期' },
    'sz002714': { name: '畜牧', type: '农业' },
    'sh600309': { name: '化工', type: '周期' },
    'sz002352': { name: '快递物流', type: '服务' },
    'sh603288': { name: '调味品', type: '消费' },
    'sh601225': { name: '钢铁', type: '周期' },
    'sh600104': { name: '汽车', type: '制造' },
    'sz000725': { name: '面板', type: '科技' },
    'sh601919': { name: '航运', type: '服务' },
    'sh600690': { name: '家电', type: '消费' },
    'sz002230': { name: '教育', type: '服务' },
    'sz002304': { name: '白酒', type: '消费' },
    'sz002032': { name: '家电', type: '消费' },
    'sh600346': { name: '化工', type: '周期' },
    'sz300015': { name: '医疗服务', type: '医疗' },
    'sh600436': { name: '中药', type: '医疗' },
    'sz002007': { name: '影视传媒', type: '服务' },
    'sh603517': { name: '食品饮料', type: '消费' },
    'sz300059': { name: '互联网金融', type: '金融' },
    'sh600660': { name: '玻璃', type: '制造' },
    'sz002607': { name: '传媒', type: '服务' },
    'sh601816': { name: '铁路', type: '服务' },
    'sz300760': { name: '医疗器械', type: '医疗' },
    'sh688012': { name: '半导体设备', type: '科技' },
    'sh600048': { name: '房地产', type: '地产' },
    'sz000002': { name: '房地产', type: '地产' },
    'sh601668': { name: '建筑', type: '基建' },
    'sz000001': { name: '银行', type: '金融' },
    'sh600000': { name: '银行', type: '金融' },
    'sz002271': { name: '防水建材', type: '制造' },
    'sh601877': { name: '电器', type: '制造' },
    'sz002049': { name: '芯片', type: '科技' },
    'sh600763': { name: '中药', type: '医疗' },
    'sz002142': { name: '银行', type: '金融' },
    'sz002601': { name: '钛白粉', type: '周期' },
    'sh600703': { name: '光伏', type: '新能源' },
    'sz000100': { name: '面板', type: '科技' },
    'sh601111': { name: '航空', type: '服务' },
    'sh600031': { name: '工程机械', type: '制造' },
    'sz002241': { name: '电子制造', type: '科技' },
    'sh600745': { name: '手机ODM', type: '科技' },
    'sz300124': { name: '工控自动化', type: '制造' },
    'sh600588': { name: '用友网络', type: '科技' },
    'sz002050': { name: '制冷元器件', type: '制造' },
    'sh601633': { name: '汽车', type: '制造' },
    'sz002841': { name: '消费电子', type: '科技' },
    'sh600406': { name: '电力设备', type: '制造' },
    'sz300274': { name: '光伏逆变器', type: '新能源' },
    'sh601601': { name: '保险', type: '金融' },
    'sz002938': { name: '电子电路', type: '科技' },
    'sh600183': { name: '覆铜板', type: '科技' },
    'sz002607': { name: '传媒', type: '服务' },
    'sh600741': { name: '汽车零部件', type: '制造' },
    // 北交所行业
    'bj832727': { name: '数据服务', type: '科技' },
    'bj835185': { name: '锂电负极', type: '新能源' },
    'bj835368': { name: '光伏设备', type: '新能源' },
    'bj832982': { name: '医美', type: '医疗' },
    'bj872808': { name: '数据中心', type: '科技' },
    'bj836247': { name: '电力设备', type: '新能源' },
    'bj834599': { name: '矿用车', type: '制造' },
    'bj833575': { name: '生物制品', type: '医疗' },
    'bj835305': { name: '大数据', type: '科技' },
    'bj830799': { name: '金融科技', type: '科技' },
    // 行业周期分类（用于选股）
  },
  // 行业周期阶段：rising(上升), mature(成熟), declining(下行), cyclical_up(周期上行), cyclical_down(周期下行)
  INDUSTRY_CYCLE: {
    '科技': 'rising', '新能源': 'cyclical_up', '医疗': 'rising',
    '消费': 'mature', '金融': 'mature', '能源': 'cyclical_down',
    '周期': 'cyclical_up', '制造': 'rising', '服务': 'mature',
    '农业': 'cyclical_down', '地产': 'declining', '基建': 'cyclical_up'
  },
  // 行业全球化程度系数（0-1）
  INDUSTRY_GLOBAL: {
    '科技': 0.8, '新能源': 0.7, '医疗': 0.5,
    '消费': 0.3, '金融': 0.2, '能源': 0.6,
    '周期': 0.5, '制造': 0.7, '服务': 0.2,
    '农业': 0.2, '地产': 0.1, '基建': 0.3
  }
};

// ============================================================
// 2. STOCK_MAP - 股票名称映射表（含主流ST股票）
// ============================================================
const STOCK_MAP = {
  // 常用蓝筹股
  '贵州茅台': 'sh600519', '中国平安': 'sh601318', '五粮液': 'sz000858',
  '招商银行': 'sh600036', '美的集团': 'sz000333', '兴业银行': 'sh601166',
  '比亚迪': 'sz002594', '长江电力': 'sh600900', '中国中免': 'sh601888',
  '恒瑞医药': 'sh600276', '格力电器': 'sz000651', '工商银行': 'sh601398',
  '农业银行': 'sh601288', '中信证券': 'sh600030', '隆基绿能': 'sh601012',
  '海螺水泥': 'sh600585', '牧原股份': 'sz002714', '泸州老窖': 'sh000568',
  '中国石油': 'sh601857', '中国石化': 'sh600028', '中国人寿': 'sh601628',
  '洋河股份': 'sz002304', '万华化学': 'sh600309', '顺丰控股': 'sz002352',
  '海天味业': 'sh603288', '宝钢股份': 'sh601225', '上汽集团': 'sh600104',
  '京东方A': 'sz000725', '中远海控': 'sh601919', '海尔智家': 'sh600690',
  '立讯精密': 'sz002475', '宁德时代': 'sz300750', '中芯国际': 'sh688981',
  '海康威视': 'sz002415', '紫金矿业': 'sh601899', '伊利股份': 'sh600887',
  '中国神华': 'sh601088', '万科A': 'sz000002', '三一重工': 'sh600031',
  '歌尔股份': 'sz002241', '汇川技术': 'sz300124',
  '阳光电源': 'sz300274', '迈瑞医疗': 'sz300760',
  '药明康德': 'sh603259', '中国太保': 'sh601601',
  '顺丰控股': 'sz002352', '东方财富': 'sz300059',
  // 科技股
  '紫光国微': 'sz002049', '闻泰科技': 'sh600745', '信维通信': 'sz300136',
  '韦尔股份': 'sh603501', '中微公司': 'sh688012', '北方华创': 'sz002371',
  // 新能源
  '通威股份': 'sh600438', '亿纬锂能': 'sz300014', '天赐材料': 'sz002709',
  // 医药
  '爱尔眼科': 'sz300015', '片仔癀': 'sh600436', '云南白药': 'sz000538',
  '智飞生物': 'sz300122', '泰格医药': 'sz300347',
  // 消费
  '中国中免': 'sh601888', '青岛啤酒': 'sh600600', '绝味食品': 'sh603517',
  '安井食品': 'sh603345', '涪陵榨菜': 'sz002507',
  // 金融
  '中信证券': 'sh600030', '华泰证券': 'sh601688', '招商银行': 'sh600036',
  '宁波银行': 'sz002142', '浦发银行': 'sh600000', '平安银行': 'sz000001',
  // ST股票（主流，含ST/\*ST双名称映射，方便用户搜索）
  'ST华铁': 'sz000976', 'ST大集': 'sz000564', 'ST工智': 'sz000156',
  'ST曙光': 'sh600303', 'ST中利': 'sz002309', 'ST爱康': 'sz002610',
  'ST美尚': 'sz300495', 'ST美晨': 'sz300237', 'ST红太阳': 'sz000525',
  'ST大药': 'sh600285', 'ST信通': 'sh600289', 'ST金山': 'sh600118',
  'ST同洲': 'sz002052', 'ST星美': 'sz002306', 'ST云网': 'sz002306',
  'ST围海': 'sz002586', 'ST天首': 'sz000109', 'ST康美': 'sh600518',
  'ST康得新': 'sz002450', 'ST辅仁': 'sh600781', 'ST秋林': 'sh600891',
  'ST德奥': 'sz002260', 'ST猛狮': 'sz002598', 'ST天润': 'sz002127',
  'ST华鼎': 'sh601113', 'ST搜特': 'sz002503', 'ST正源': 'sh600261',
  'ST银河': 'sz000806', 'ST瀚叶': 'sh600226', 'ST中安': 'sh600654',
  'ST安通': 'sh600179', 'ST新亿': 'sh600145', 'ST宜生': 'sh600978',
  'ST德威': 'sz300325', 'ST腾信': 'sz002464', 'ST丰华': 'sh600604',
  'ST昌鱼': 'sh600275', 'ST亚星': 'sh600319', 'ST南化': 'sh600301',
  // ST股票-补充常见别名（无*前缀版本，方便搜索）
  'ST深南': 'sz000017', 'ST信威': 'sh600482', 'ST航通': 'sh600677',
  'ST数知': 'sz300038', 'ST斯太': 'sz000760', 'ST众泰': 'sz000980',
  'ST长生': 'sz300003', 'ST金钰': 'sh600086', 'ST宜化': 'sz000422',
  'ST科迪': 'sh600251', 'ST华仪': 'sh600290', 'ST鹏起': 'sh600614',
  'ST富控': 'sh600634', 'ST工新': 'sh600701',
  // ST股票-补充更多常见ST股票
  'ST长油': 'sh601975', '*ST长油': 'sh601975',
  'ST中安消': 'sh600654', 'ST中绒': 'sh600110', 'ST中珠': 'sh600568',
  'ST乐视网': 'sz300104', 'ST乐视': 'sz300104',
  'ST保千': 'sh600076', 'ST千玺': 'sh600076',
  'ST信威': 'sh600482', 'ST冠福': 'sz002102',
  'ST天业': 'sh600075', 'ST大唐': 'sh600198',
  'ST大晟': 'sh600892', 'ST奥维': 'sz002231',
  'ST安奈儿': 'sz002825', 'ST安泰': 'sh600621',
  'ST宝实': 'sz000557', 'ST宝鼎': 'sz002552',
  'ST巴士': 'sz002188', 'ST当代': 'sz000046',
  'ST德威': 'sz300325', 'ST思美': 'sz002712',
  'ST恒立': 'sh600318', 'ST慧球': 'sh600556',
  'ST成城': 'sh600247', 'ST方源': 'sh600656',
  'ST昌九': 'sh600228', 'ST景谷': 'sh600265',
  'ST有棵树': 'sz002591', 'ST柏堡': 'sz002776',
  'ST中昌': 'sh600242', 'ST中天': 'sz000542',
  'ST节能': 'sh600157', 'ST华信': 'sz002656',
  'ST湘电': 'sh600416', 'ST新海': 'sz002089',
  'ST云维': 'sh600725', 'ST九有': 'sh600228',
  // *ST 完整版
  '*ST深南': 'sz000017', '*ST信威': 'sh600482', '*ST航通': 'sh600677',
  '*ST数知': 'sz300038', '*ST斯太': 'sz000760', '*ST众泰': 'sz000980',
  '*ST长生': 'sz300003', '*ST金钰': 'sh600086', '*ST宜化': 'sz000422',
  '*ST德奥': 'sz002260', '*ST科迪': 'sh600251', '*ST华仪': 'sh600290',
  '*ST鹏起': 'sh600614', '*ST富控': 'sh600634', '*ST工新': 'sh600701',
  '*ST长油': 'sh601975',
  // 补充更多常用
  '万科': 'sz000002', '京东方': 'sz000725', '比亚迪': 'sz002594',
  '中国平安': 'sh601318', '宁德时代': 'sz300750', '中芯国际': 'sh688981',
  '中国国航': 'sh601111', '南方航空': 'sh600029', '东方雨虹': 'sz002271',
  '正泰电器': 'sh601877', '视源股份': 'sz002841',
  // ===== 港股 =====
  '腾讯控股': 'hk00700', '阿里巴巴': 'hk09988', '美团': 'hk03690',
  '小米集团': 'hk01810', '京东集团': 'hk09618', '百度集团': 'hk09888',
  '快手': 'hk01024', '哔哩哔哩': 'hk09626', '网易': 'hk09999',
  '商汤科技': 'hk00020', '金蝶国际': 'hk00268', '金山软件': 'hk03888',
  '联想集团': 'hk00992', '中芯国际港股': 'hk00981', '华虹半导体': 'hk01347',
  '微盟集团': 'hk02013', '明源云': 'hk00909',
  '比亚迪港股': 'hk01211', '理想汽车': 'hk02015', '蔚来': 'hk09866',
  '小鹏汽车': 'hk09868', '吉利汽车': 'hk00175', '长城汽车': 'hk02333',
  '广汽集团': 'hk02238', '东风集团': 'hk00489', '长安汽车港股': 'hk01138',
  '零跑汽车': 'hk09863', '哪吒汽车港股': 'hk01880',
  '汇丰控股': 'hk00005', '友邦保险': 'hk01299', '香港交易所': 'hk00388',
  '港交所': 'hk00388', '恒生银行': 'hk00011', '中银香港': 'hk02388',
  '中国平安港股': 'hk02318', '中国人寿港股': 'hk02628', '中国太保港股': 'hk02601',
  '中国人民保险': 'hk01339', '众安在线': 'hk06060',
  '中国移动': 'hk00941', '中国电信': 'hk00728', '中国联通港股': 'hk00762',
  '中国铁塔': 'hk00788', '中兴通讯港股': 'hk00763', '小米集团-W': 'hk01810',
  '长飞光纤': 'hk06869', '京信通信': 'hk02342', '中国通信服务': 'hk00552',
  '中国海洋石油': 'hk00883', '中国石油港股': 'hk00857', '中国石化港股': 'hk00386',
  '中海油田服务': 'hk02883', '中石化冠德': 'hk00934',
  '中国银行港股': 'hk03988', '建设银行港股': 'hk00939', '工商银行港股': 'hk01398',
  '农业银行港股': 'hk01288', '交通银行港股': 'hk03328', '邮储银行': 'hk01658',
  '招商银行港股': 'hk03968', '中信银行港股': 'hk00998', '民生银行港股': 'hk01988',
  '中国财险': 'hk02328',
  '华润啤酒': 'hk00291', '蒙牛乳业': 'hk02319', '农夫山泉': 'hk09633',
  '青岛啤酒港股': 'hk00168', '康师傅控股': 'hk00322', '中国飞鹤': 'hk06186',
  '海底捞': 'hk06862', '九毛九': 'hk09922', '呷哺呷哺港股': 'hk00520',
  '百威亚太': 'hk01876', '安踏体育': 'hk02020', '李宁': 'hk02331',
  '特步国际': 'hk01368', '361度': 'hk01361',
  '万科企业': 'hk02202', '碧桂园': 'hk02007', '融创中国': 'hk01918',
  '龙湖集团': 'hk00960', '华润置地': 'hk01109', '中海发展': 'hk00688',
  '保利物业': 'hk06049', '碧桂园服务': 'hk06098',
  '药明生物': 'hk02269', '百济神州': 'hk06160', '信达生物': 'hk01801',
  '君实生物': 'hk01877', '石药集团': 'hk01093', '中国生物制药': 'hk01177',
  '翰森制药': 'hk02080', '再鼎医药': 'hk09688', '康方生物': 'hk09926',
  '阿里健康': 'hk00241', '平安好医生': 'hk01833', '京东健康': 'hk06618',
  '美团-W': 'hk03690',
  '申洲国际': 'hk02313', '舜宇光学': 'hk02382', '瑞声科技': 'hk02018',
  '丘钛科技': 'hk01478', '比亚迪电子': 'hk00285', '富智康': 'hk02038',
  '中国宏桥': 'hk01378', '海螺水泥港股': 'hk00914', '紫金矿业港股': 'hk02899',
  '中国神华港股': 'hk01088', '兖矿能源': 'hk01171', '江西铜业': 'hk00358',
  '中信证券港股': 'hk06030', '华泰证券港股': 'hk06886',
  '中国电力': 'hk02380', '华能国际': 'hk00902', '中广核电力': 'hk01816',
  '新奥能源': 'hk02688', '华润电力': 'hk00836',
  '携程集团': 'hk09961', '同程旅行': 'hk00780', '复星旅游文化': 'hk01992',
  '金沙中国': 'hk01928', '银河娱乐': 'hk00027', '永利澳门': 'hk01128',
  '新濠博亚': 'hk00200',
  '中通快递': 'hk02057', '京东物流': 'hk02618', '菜鸟港股': 'hk02057',
  '极兔速递': 'hk01519',
  '海丰国际': 'hk01308', '东方海外国际': 'hk00316',
  '中国中药': 'hk00570', '同仁堂科技': 'hk01666',
  '中国烟草': 'hk00000', '思摩尔国际': 'hk06969',
  
  // ===== 热门ETF基金（50+只）=====
  // 宽基ETF
  '沪深300ETF': 'sh510300', '中证500ETF': 'sh510500', '创业板ETF': 'sz159915',
  '上证50ETF': 'sh510050', '中证1000ETF': 'sh512100', '科创50ETF': 'sh588000',
  '深证100ETF': 'sz159901', '中小板ETF': 'sz159902', '双创50ETF': 'sh588300',
  '创业板50ETF': 'sz159949', '上证180ETF': 'sh510180', '中证800ETF': 'sh515800',
  '国证2000ETF': 'sh560000', '中证2000ETF': 'sh563300', '富时中国A50ETF': 'sh510850',
  'MSCI中国A50ETF': 'sh560050', '北证50ETF': 'bj899050',
  // 行业ETF-科技
  '半导体ETF': 'sh512480', '芯片ETF': 'sh159995', '人工智能ETF': 'sh515980',
  '5GETF': 'sh515050', '通信ETF': 'sh515880', '计算机ETF': 'sh512720',
  '软件ETF': 'sh515230', '云计算ETF': 'sh516510', '大数据ETF': 'sh515400',
  '物联网ETF': 'sh516330', '机器人ETF': 'sh562500', '信创ETF': 'sh562030',
  // 行业ETF-新能源
  '新能源ETF': 'sh516160', '光伏ETF': 'sh515790', '新能源车ETF': 'sh515030',
  '碳中和ETF': 'sh516070', '锂电池ETF': 'sz159840', '储能ETF': 'sh516850',
  '电力ETF': 'sh562350',
  // 行业ETF-消费
  '消费ETF': 'sh159928', '食品饮料ETF': 'sh515170', '白酒ETF': 'sh512690',
  '医药ETF': 'sh512010', '医疗ETF': 'sh512170', '创新药ETF': 'sh515120',
  '中药ETF': 'sh560080', '养殖ETF': 'sh516670', '旅游ETF': 'sh516560',
  // 行业ETF-金融
  '银行ETF': 'sh512800', '证券ETF': 'sh512880', '保险ETF': 'sh512070',
  '金融ETF': 'sh510230', '房地产ETF': 'sh512200', '红利ETF': 'sh510880',
  '高股息ETF': 'sh563020',
  // 行业ETF-周期/制造
  '军工ETF': 'sh512660', '钢铁ETF': 'sh515210', '煤炭ETF': 'sh515220',
  '有色ETF': 'sh512400', '化工ETF': 'sh516020', '基建ETF': 'sh516950',
  '农业ETF': 'sh516550',
  // 跨境ETF
  '恒生ETF': 'sh159920', '恒生科技ETF': 'sh513180', '中概互联ETF': 'sh513050',
  '纳指ETF': 'sh513100', '标普500ETF': 'sh513500', '日经ETF': 'sh513880',
  '德国ETF': 'sh513030', '法国ETF': 'sh513080',
  // 商品/债券ETF
  '黄金ETF': 'sh518880', '豆粕ETF': 'sz159985', '有色金属ETF': 'sh512400',
  // 策略/主题ETF
  '红利低波ETF': 'sh512890', '质量成长ETF': 'sh560600', 'ESG ETF': 'sh560090',

  // ===== 热门可转债（30+只）=====
  '转债ETF': 'sh511380', '南银转债': 'sh113050', '兴业转债': 'sh113052',
  '中银转债': 'sh113055', '杭银转债': 'sh110079', '苏银转债': 'sh110053',
  '成银转债': 'sh113057', '青农转债': 'sh113053', '浦发转债': 'sh110059',
  '平银转债': 'sz127050', '南航转债': 'sz127033', '国泰转债': 'sh113048',
  '华安转债': 'sh113056', '中微转债': 'sh118013', '伯特转债': 'sh113633',
  '博杰转债': 'sz127067', '万兴转债': 'sz123141', '晶科转债': 'sh118025',
  '中矿转债': 'sz123149', '天铁转债': 'sz123145', '丰山转债': 'sh113630',
  '永东转债': 'sz128071', '润达转债': 'sh113648', '精测转债': 'sz123066',
  '华翔转债': 'sh113653', '欧22转债': 'sh113646', '鼎胜转债': 'sh113026',
  '金宏转债': 'sh118019', '伟测转债': 'sh118027', '海优转债': 'sh118008',
  '瑞达转债': 'sz127069', '力诺转债': 'sz123155',

  // ===== 基础设施REITs（10+只）=====
  '中金普洛斯REIT': 'sh508056', '博时招商REIT': 'sz180101',
  '红土盐田REIT': 'sz180301', '华夏中国交建REIT': 'sh508018',
  '富国首创REIT': 'sh508006', '东吴苏园REIT': 'sh508027',
  '中航首钢绿能REIT': 'sz180801', '鹏华广州广河REIT': 'sz180401',
  '平安广州广河REIT': 'sz180401', '国泰君安临港REIT': 'sh508025',
  '中金安徽交控REIT': 'sh508011', '华夏和达高科REIT': 'sh508028',
  '嘉实京东仓储REIT': 'sh508098', '中金厦门安居REIT': 'sh508058',
  '红土深圳安居REIT': 'sz180501', '华夏北京保障房REIT': 'sh508068',

  // ===== 北交所/新三板扩充（50+只）=====
  '每日互动': 'bj832727', '贝特瑞': 'bj835185', '连城数控': 'bj835368',
  '创远仪器': 'bj831961', '同辉信息': 'bj430047', '佳先股份': 'bj430489',
  '球冠电缆': 'bj834682', '广道高新': 'bj839680', '永顺生物': 'bj839729',
  '吉冈精密': 'bj836720', '虹安电子': 'bj832566', '流金科技': 'bj832571',
  '秉扬科技': 'bj836675', '中设咨询': 'bj836871', '德众汽车': 'bj838030',
  '利通科技': 'bj832225', '富士达': 'bj835640', '同力股份': 'bj834599',
  '长虹能源': 'bj836247', '恒光股份': 'bj301118',
  '云创数据': 'bj835305', '艾融软件': 'bj830799', '殷图网联': 'bj835515',
  '中航机电': 'bj833171', '鑫磊股份': 'bj301317', '天纺标': 'bj871753',
  '海达尔': 'bj836699', '明阳科技': 'bj837663',
  // 北交所扩充
  '锦波生物': 'bj832982', '曙光数创': 'bj872808', '民士达': 'bj833394',
  '华岭股份': 'bj430139', '诺思兰德': 'bj430047', '吉林碳谷': 'bj836077',
  '硅烷科技': 'bj838402', '惠丰钻石': 'bj839725', '科达自控': 'bj831305',
  '利君股份': 'bj430030', '恒合股份': 'bj837152', '朗鸿科技': 'bj836395',
  '丰光精密': 'bj430510', '志晟信息': 'bj835640', '三祥科技': 'bj837220',
  '华密新材': 'bj836221', '润农节水': 'bj834021', '长虹美菱': 'bj200832',
  '凯德石英': 'bj835185', '吉林敖东': 'bj000776', '中裕科技': 'bj871692',
  '雅葆轩': 'bj870688', '卓兆点胶': 'bj871642', '万源通': 'bj873833',
  '苏轴股份': 'bj430418', '格利尔': 'bj831641', '天马新材': 'bj838971',
  '泰鹏智能': 'bj872668', '康乐卫士': 'bj833575', '艾融软件': 'bj830799',


  // 常用A股扩充（交通运输/航空/旅游）
  '上海机场': 'sh600009', '白云机场': 'sh600004', '深圳机场': 'sz000089',
  '中国国航': 'sh601111', '南方航空': 'sh600029', '东方航空': 'sh600115',
  '海南航空': 'sh600221', '春秋航空': 'sh601021', '吉祥航空': 'sh603885',
  '中远海控': 'sh601919', '招商轮船': 'sh601872', '中远海能': 'sh600026',
  '中国交建': 'sh601800', '中国中铁': 'sh601390', '中国铁建': 'sh601186',
  '京沪高铁': 'sh601816', '大秦铁路': 'sh601006', '广深铁路': 'sh601333',
  // 常用A股（消费/医药/地产）
  '拓尔思': 'sz300229', '中国中免': 'sh601888', '王府井': 'sh600859',
  '永辉超市': 'sh601933', '苏宁易购': 'sz002024', '国美零售': 'sz002024',
  '保利发展': 'sh600048', '万科A': 'sz000002', '招商蛇口': 'sz001979',
  '金地集团': 'sh600383', '绿城中国': 'sh600007', '华侨城': 'sz000069',
  '融创中国': 'sz001519', '华润置地': 'sh600919', '龙湖集团': 'sz000961',
  '片仔癀': 'sh600436', '云南白药': 'sz000538', '同仁堂': 'sh600085',
  '华东医药': 'sz000963', '复星医药': 'sh600196', '药明康德': 'sh603259',
  '智飞生物': 'sz300122', '长春高新': 'sz000661', '以岭药业': 'sz002603',
  '康泰生物': 'sz300601', '华兰生物': 'sz002007', '天坛生物': 'sh600161',
  // 常用A股（能源/电力/公用事业）
  '中国神华': 'sh601088', '兖矿能源': 'sh600188', '中煤能源': 'sh601898',
  '陕西煤业': 'sh601225', '山西焦煤': 'sz000983', '潞安环能': 'sh601699',
  '国电电力': 'sh600795', '华能国际': 'sh600011', '大唐发电': 'sh601991',
  '华电国际': 'sh600027', '川投能源': 'sh600674', '粤电力': 'sz000539',
  '长江电力': 'sh600900', '华能水电': 'sh600025', '国投电力': 'sh600886',
  '三峡能源': 'sh600905', '龙源电力': 'sz001289', '节能风电': 'sh601016',
  '中国核电': 'sh601985', '中国广核': 'sz003816', '福能股份': 'sh600483',
  // 常用A股（科技/通信/软件）
  '海南华铁': 'sz000409', '拓尔思': 'sz300229', '科大讯飞': 'sz002230', '用友网络': 'sh600588',
  '金蝶国际': 'sh600588', '金山办公': 'sh688111', '广联达': 'sz002410',
  '紫光股份': 'sz000938', '浪潮信息': 'sz000977', '中科曙光': 'sh603019',
  '深信服': 'sz300454', '启明星辰': 'sz002439', '安恒信息': 'sh688023',
  '奇安信': 'sh688561', '三六零': 'sh601360', '天融信': 'sz002212',
  '中科创达': 'sz300496', '恒生电子': 'sh600570', '同花顺': 'sz300033',
  '东方国信': 'sz300166', '汉得信息': 'sz300170', '宝信软件': 'sh600845',
  '润和软件': 'sz300339', '软通动力': 'sz301236', '中国软件': 'sh600536',
  '太极股份': 'sz002368', '南大光电': 'sz300346', '北方华创': 'sz002371',
  // 常用A股（金融/保险）
  '中信证券': 'sh600030', '华泰证券': 'sh601688', '国泰君安': 'sh601211',
  '海通证券': 'sh600837', '广发证券': 'sz000776', '中金公司': 'sh601995',
  '东方证券': 'sh600958', '光大证券': 'sh601788', '招商证券': 'sh600999',
  '中国银河': 'sh601881', '长江证券': 'sz000783', '国元证券': 'sz000728',
  '中国人保': 'sh601319', '新华保险': 'sh601336', '中国太保': 'sh601601',
  '天风证券': 'sh601162', '中银证券': 'sh601696', '东吴证券': 'sh601555',
  // 常用A股（军工）
  '中航沈飞': 'sh600760', '航发动力': 'sh600893', '中航西飞': 'sz000768',
  '中航光电': 'sz002179', '紫光国微': 'sz002049', '中航电子': 'sh600372',
  '航天电器': 'sz002025', '中国卫星': 'sh600118', '航天科技': 'sz000901',
  '北方导航': 'sh600435', '中直股份': 'sh600038', '洪都航空': 'sh600316',
  '振华科技': 'sz000733', '景嘉微': 'sz300474', '睿创微纳': 'sh688002',
  // 常用A股（汽车/机械/制造）
  '上汽集团': 'sh600104', '长城汽车': 'sh601633', '长安汽车': 'sz000625',
  '广汽集团': 'sh601238', '比亚迪': 'sz002594', '赛力斯': 'sh601127',
  '理想汽车': 'sz002459', '小鹏汽车': 'sz009868', '蔚来汽车': 'sz09866',
  '潍柴动力': 'sz000338', '三一重工': 'sh600031', '徐工机械': 'sz000425',
  '中联重科': 'sz000157', '柳工': 'sz000528', '中国中车': 'sh601766',
  '福耀玻璃': 'sh600660', '华域汽车': 'sh600741', '均胜电子': 'sh600699',
  // 常用A股（食品/农业）
  '贵州茅台': 'sh600519', '五粮液': 'sz000858', '泸州老窖': 'sz000568',
  '山西汾酒': 'sh600809', '洋河股份': 'sz002304', '古井贡酒': 'sz000596',
  '伊利股份': 'sh600887', '蒙牛乳业': 'hk02319', '双汇发展': 'sz000895',
  '海天味业': 'sh603288', '中炬高新': 'sh600872', '涪陵榨菜': 'sz002507',
  '洽洽食品': 'sz002557', '良品铺子': 'sh603719', '三只松鼠': 'sz300783',
  '绝味食品': 'sh603517', '安井食品': 'sh603345', '温氏股份': 'sz300498',
  '牧原股份': 'sz002714', '新希望': 'sz000876', '正邦科技': 'sz002157',
  // 常用A股（电子/半导体/光电）
  '京东方A': 'sz000725', 'TCL科技': 'sz000100', '深天马': 'sz000050',
  '韦尔股份': 'sh603501', '卓胜微': 'sz300782', '兆易创新': 'sh603986',
  '圣邦股份': 'sz300661', '澜起科技': 'sh688008', '长电科技': 'sh600584',
  '通富微电': 'sz002156', '华天科技': 'sz002185', '士兰微': 'sh600460',
  '闻泰科技': 'sh600745', '立讯精密': 'sz002475', '歌尔股份': 'sz002241',
  '蓝思科技': 'sz300433', '德赛电池': 'sz000049', '欣旺达': 'sz300207',
  // 常用A股（互联网/传媒/游戏）
  '三七互娱': 'sz002555', '完美世界': 'sz002624', '巨人网络': 'sz002558',
  '昆仑万维': 'sz300418', '世纪华通': 'sz002602', '恺英网络': 'sz002517',
  '芒果超媒': 'sz300413', '分众传媒': 'sz002027', '光线传媒': 'sz300251',
  '万达电影': 'sz002739', '华谊兄弟': 'sz300027', '中文在线': 'sz300364',
  // 新股/次新股
  'N中芯': 'sh688981', 'N华大': 'sh688036', '华润微': 'sh688396',
  '中微公司': 'sh688012', '芯原股份': 'sh688521', '寒武纪': 'sh688256',
  '地平线': 'sh688702', '壁仞科技': 'sh688385',

    // 港股通热门
  '恒安国际': 'hk01044', '维达国际': 'hk03331', '敏华控股': 'hk01999',
  '蒙牛': 'hk02319', '创科实业': 'hk00669', '耐世特': 'hk01579',
  // ===== 美股 =====
  '苹果': 'usAAPL', '微软': 'usMSFT', '谷歌': 'usGOOGL',
  '亚马逊': 'usAMZN', 'Meta': 'usMETA', '特斯拉': 'usTSLA',
  '英伟达': 'usNVDA', '台积电': 'usTSM', '奈飞': 'usNFLX',
  '阿里巴巴美股': 'usBABA', '京东美股': 'usJD', '拼多多': 'usPDD',
  '百度美股': 'usBIDU', '网易美股': 'usNTES', '哔哩哔哩美股': 'usBILI',
  '蔚来美股': 'usNIO', '理想美股': 'usLI', '小鹏美股': 'usXPEV',
  '富途控股': 'usFUTU', '老虎证券': 'usTIGR', '携程美股': 'usTCOM',
  '名创优品': 'usMNSO', '知乎': 'usZH', '微博': 'usWB',
  '贝壳': 'usBEKE', '叮咚买菜': 'usDDL', '雾芯科技': 'usRLX',
  '中芯国际美股': 'usSMIC', '华住集团': 'usHTHT',
  '好未来': 'usTAL', '新东方': 'usEDU', '高途': 'usGOTU',

};

// 反转映射：代码 -> 名称
const CODE_TO_NAME = {};
Object.entries(STOCK_MAP).forEach(([name, code]) => { CODE_TO_NAME[code] = name; });

// ============================================================
// 3. Utils - 工具函数
// ============================================================
const Utils = {
  /** 将ArrayBuffer从GBK转为UTF-8字符串（腾讯API必须） */
  gbkToUtf8(arrayBuffer) {
    const decoder = new TextDecoder('gbk');
    return decoder.decode(arrayBuffer);
  },

  /** 解析腾讯行情数据（qt.gtimg.cn格式）
   * 字段说明：f[1]名称 f[2]代码 f[3]现价 f[4]昨收 f[5]今开 f[6]成交量(手)
   * f[30]时间 f[31]涨跌额 f[32]涨跌幅 f[33]最高 f[34]最低
   * f[35]价格/成交量 f[36]成交量(手) f[37]成交额(万) f[38]换手率
   * f[39]市盈率 f[44]流通市值(亿) f[45]总市值(亿) f[46]市净率
   * f[43]振幅 f[49]涨停价 f[41]跌停价
   */
  parseTencentQuote(text) {
    const match = text.match(/v_[a-z]{2}\d+="(.+)"/);
    if (!match) return null;
    const f = match[1].split('~');
    if (f.length < 45) return null;
    const price = +f[3];
    const prevClose = +f[4];
    // 计算涨跌额和涨跌幅（作为备用）
    const calcChange = price - prevClose;
    const calcChangePct = prevClose > 0 ? (calcChange / prevClose * 100) : 0;
    return {
      name: f[1],
      code: f[2],
      price: price,
      prevClose: prevClose,
      open: +f[5],
      volume: +f[6], // 手
      buyVol: +f[7] || 0,
      sellVol: +f[8] || 0,
      high: +f[33] || price,
      low: +f[34] || price,
      change: +f[31] || calcChange,
      changePct: +f[32] || calcChangePct,
      turnover: +f[38] || 0, // 换手率
      pe: +f[39] || 0, // 市盈率
      pb: +f[46] || 0, // 市净率
      amount: (+f[37] || 0), // 成交额（万）
      marketCap: +f[45] || 0, // 总市值（亿）
      circCap: +f[44] || 0, // 流通市值（亿）
      amplitude: +f[43] || (prevClose > 0 ? ((+f[33] - +f[34]) / prevClose * 100) : 0),
      time: f[30] || '',
    };
  },

  /** 格式化金额 */
  formatMoney(val, unit = '亿') {
    if (isNaN(val) || val === 0) return '--';
    if (unit === '亿') return (val / 1e8).toFixed(2) + '亿';
    if (unit === '万') return (val / 1e4).toFixed(2) + '万';
    return val.toFixed(2);
  },

  formatAmount(val) {
    if (isNaN(val)) return '--';
    if (val >= 1e8) return (val / 1e8).toFixed(2) + '亿';
    if (val >= 1e4) return (val / 1e4).toFixed(0) + '万';
    return val.toFixed(2);
  },

  /** 格式化涨跌颜色 */
  colorClass(val) {
    if (val > 0) return 'color-up';
    if (val < 0) return 'color-down';
    return 'color-flat';
  },

  /** 格式化涨跌文字 */
  formatChange(val, pct) {
    if (isNaN(val)) return '--';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}  ${sign}${pct.toFixed(2)}%`;
  },

  /** 获取股票代码前缀 */
  getMarketPrefix(code) {
    if (code.startsWith('6') || code.startsWith('sh')) return 'sh';
    return 'sz';
  },

  /** 规范化股票代码（统一为sh/sz/hk/us+代码） */
  normalizeCode(code) {
    code = code.trim().toLowerCase();
    if (/^(sh|sz|bj)\d{6}$/.test(code)) return code;
    if (/^hk\d{5}$/.test(code)) return code;
    if (/^us[a-z]+$/i.test(code)) return code;
    // 尝试港股5位代码（纯数字5位）
    if (/^\d{5}$/.test(code)) return 'hk' + code;
    if (/^\d{6}$/.test(code)) {
      // 北交所/新三板：8开头或43/4开头
      if (code.startsWith('8') || code.startsWith('43') || code.startsWith('40') || code.startsWith('41') || code.startsWith('42')) return 'bj' + code;
      // 沪市ETF/REITs
      if (code.startsWith('51') || code.startsWith('508') || code.startsWith('56')) return 'sh' + code;
      // 深市ETF/可转债
      if (code.startsWith('15') || code.startsWith('12') || code.startsWith('16')) return 'sz' + code;
      // 沪市主板/科创板/可转债
      if (code.startsWith('6') || code.startsWith('9')) return 'sh' + code;
      // 沪市可转债 11开头
      if (code.startsWith('11')) return 'sh' + code;
      return 'sz' + code;
    }
    return null;
  },

  /** 显示Toast提示 */
  toast(msg, duration = 2000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), duration);
  },

  /** 计算移动平均 */
  calcMA(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  },

  /** 计算EMA */
  calcEMA(data, period) {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const ema = [data.slice(0, period).reduce((a, b) => a + b, 0) / period];
    for (let i = period; i < data.length; i++) {
      ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
    }
    return ema;
  },

  /** 计算MACD */
  calcMACD(closes) {
    if (closes.length < 26) return { dif: 0, dea: 0, macd: 0 };
    const ema12 = this.calcEMA(closes, 12);
    const ema26 = this.calcEMA(closes, 26);
    const len = Math.min(ema12.length, ema26.length);
    const dif = [];
    for (let i = 0; i < len; i++) {
      dif.push(ema12[ema12.length - len + i] - ema26[ema26.length - len + i]);
    }
    const dea = this.calcEMA(dif, 9);
    const lastDIF = dif[dif.length - 1] || 0;
    const lastDEA = dea.length > 0 ? dea[dea.length - 1] : 0;
    return { dif: lastDIF, dea: lastDEA, macd: (lastDIF - lastDEA) * 2 };
  },

  /** 计算RSI */
  calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - 100 / (1 + rs);
  },

  /** 计算VWAP（主力成本估算） */
  calcVWAP(klines) {
    if (!klines || klines.length === 0) return 0;
    let totalAmt = 0, totalVol = 0;
    klines.forEach(k => {
      const price = (k[1] + k[2] + k[3] + k[4]) / 4; // (开+高+低+收)/4
      totalAmt += price * k[5];
      totalVol += k[5];
    });
    return totalVol > 0 ? totalAmt / totalVol : 0;
  },

  /** 计算支撑位和压力位 */
  calcSupportResistance(klines, currentPrice) {
    if (!klines || klines.length < 5) return { support: 0, resistance: 0 };
    const recent = klines.slice(-20);
    const lows = recent.map(k => k[3]); // 最低价
    const highs = recent.map(k => k[2]); // 最高价
    const closes = recent.map(k => k[4]);
    
    // 支撑位：近期最低收盘价
    const support = Math.min(...lows) * 1.005;
    // 压力位：近期最高价
    const resistance = Math.max(...highs) * 0.995;
    
    return { support: +support.toFixed(2), resistance: +resistance.toFixed(2) };
  },

  /** 评分转等级文字 */
  scoreLevel(score) {
    if (score >= 90) return '★★★★★';
    if (score >= 75) return '★★★★☆';
    if (score >= 60) return '★★★☆☆';
    if (score >= 40) return '★★☆☆☆';
    return '★☆☆☆☆';
  },

  scoreLevelText(score) {
    if (score >= 90) return '极优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '一般';
    if (score >= 40) return '较弱';
    return '危险';
  },

  scoreColor(score) {
    if (score >= 75) return '#00e676';
    if (score >= 60) return '#00d4ff';
    if (score >= 40) return '#ffa726';
    return '#ff4757';
  },

  fiveDimScore(quote, klines) {
    if (!quote || !quote.price || quote.price <= 0) return { total: 0, dims: { fundamental: 0, technical: 0, capital: 0, valuation: 0, sentiment: 0 } };
    const fundamental = this._scoreFundamentalQuick(quote, klines);
    const technical = this._scoreTechnicalQuick(klines, quote);
    const capital = this._scoreCapitalQuick(quote, klines);
    const valuation = this._scoreValuationQuick(quote);
    const sentiment = this._scoreSentimentQuick(quote, klines);
    const total = Math.round(fundamental * 0.30 + technical * 0.25 + capital * 0.20 + valuation * 0.15 + sentiment * 0.10);
    return { total: Math.max(0, Math.min(100, total)), dims: { fundamental, technical, capital, valuation, sentiment } };
  },

  _scoreFundamentalQuick(quote, klines) {
    let s = 50;
    if (quote.pe > 0 && quote.pe < 12) s += 25;
    else if (quote.pe >= 12 && quote.pe < 20) s += 18;
    else if (quote.pe >= 20 && quote.pe < 35) s += 8;
    else if (quote.pe >= 35 && quote.pe < 60) s -= 5;
    else if (quote.pe >= 60 || quote.pe < 0) s -= 20;
    if (quote.pb > 0 && quote.pb < 1.2) s += 15;
    else if (quote.pb >= 1.2 && quote.pb < 2.5) s += 10;
    else if (quote.pb >= 2.5 && quote.pb < 4) s += 2;
    else if (quote.pb >= 4 || quote.pb < 0) s -= 10;
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const ma5 = this.calcMA(closes, 5);
      const ma20 = this.calcMA(closes, 20);
      if (ma5 && ma20) {
        const prevMa5 = closes.length >= 6 ? this.calcMA(closes.slice(0, -1), 5) : ma5;
        if (ma5 > ma20 && ma5 > prevMa5) s += 10;
        else if (ma5 > ma20) s += 5;
        else if (ma5 < ma20 && ma5 < prevMa5) s -= 10;
      }
    }
    if (quote.marketCap > 1000) s += 10;
    else if (quote.marketCap > 500) s += 8;
    else if (quote.marketCap > 100) s += 3;
    else s -= 8;
    return Math.max(0, Math.min(100, s));
  },

  _scoreTechnicalQuick(klines, quote) {
    if (!klines || klines.length < 20) return 50;
    let s = 50;
    const closes = klines.map(k => k.close);
    const current = quote.price;
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);
    const ma30 = this.calcMA(closes, Math.min(30, closes.length));
    if (ma5 && ma10 && ma20) {
      if (ma5 > ma10 && ma10 > ma20) s += 18;
      else if (ma5 > ma10) s += 10;
      else if (ma5 < ma10 && ma10 < ma20) s -= 15;
      if (ma30 && ma20 > ma30) s += 5;
    }
    const high30 = Math.max(...closes.slice(-30));
    const low30 = Math.min(...closes.slice(-30));
    if (high30 > low30) {
      const pos = (current - low30) / (high30 - low30);
      if (pos > 0.7) s += 8;
      else if (pos > 0.4) s += 4;
      else if (pos < 0.15) s -= 5;
    }
    if (closes.length >= 10) {
      const changes = [];
      for (let i = closes.length - 5; i < closes.length; i++) {
        changes.push((closes[i] - closes[i-1]) / closes[i-1] * 100);
      }
      const avgChg = changes.reduce((a,b) => a+b, 0) / changes.length;
      const variance = changes.reduce((a,b) => a + (b-avgChg)**2, 0) / changes.length;
      if (avgChg > 0 && variance < 4) s += 8;
      else if (avgChg > 0) s += 4;
      else if (avgChg < -2) s -= 8;
    }
    return Math.max(0, Math.min(100, s));
  },

  _scoreCapitalQuick(quote, klines) {
    let s = 50;
    const turnover = quote.turnover || 0;
    if (turnover >= 2 && turnover <= 5) s += 18;
    else if (turnover > 5 && turnover <= 8) s += 12;
    else if (turnover > 1 && turnover < 2) s += 6;
    else if (turnover > 8 && turnover <= 15) s -= 5;
    else if (turnover > 15) s -= 15;
    else s -= 5;
    if (klines && klines.length >= 20) {
      const vols = klines.map(k => k.volume);
      const vol5 = vols.slice(-5).reduce((a,b) => a+b, 0) / 5;
      const vol20 = vols.slice(-20).reduce((a,b) => a+b, 0) / 20;
      if (vol20 > 0) {
        const ratio = vol5 / vol20;
        if (ratio > 1.3 && quote.changePct > 0) s += 15;
        else if (ratio > 1.3 && quote.changePct < 0) s -= 10;
        else if (ratio < 0.7 && quote.changePct > 0) s += 5;
        else if (ratio > 1.5 && quote.changePct < -3) s -= 15;
      }
    }
    if (quote.changePct > 0 && turnover > 3) s += 8;
    else if (quote.changePct < -3 && turnover > 8) s -= 10;
    return Math.max(0, Math.min(100, s));
  },

  _scoreValuationQuick(quote) {
    let s = 50;
    if (quote.pe > 0 && quote.pe < 10) s += 25;
    else if (quote.pe >= 10 && quote.pe < 18) s += 18;
    else if (quote.pe >= 18 && quote.pe < 30) s += 8;
    else if (quote.pe >= 30 && quote.pe < 50) s -= 5;
    else if (quote.pe >= 50 || quote.pe < 0) s -= 20;
    if (quote.pb > 0 && quote.pb < 1) s += 20;
    else if (quote.pb >= 1 && quote.pb < 2) s += 12;
    else if (quote.pb >= 2 && quote.pb < 3.5) s += 5;
    else if (quote.pb >= 3.5 && quote.pb < 6) s -= 5;
    else if (quote.pb >= 6 || quote.pb < 0) s -= 15;
    if (quote.marketCap > 800) s += 10;
    else if (quote.marketCap > 300) s += 5;
    else if (quote.marketCap < 50) s -= 10;
    return Math.max(0, Math.min(100, s));
  },

  _scoreSentimentQuick(quote, klines) {
    let s = 50;
    if (klines && klines.length >= 10) {
      const closes = klines.map(k => k.close);
      const changes = [];
      for (let i = closes.length - 10; i < closes.length; i++) {
        changes.push(Math.abs((closes[i] - closes[i-1]) / closes[i-1] * 100));
      }
      const avgVol = changes.reduce((a,b) => a+b, 0) / changes.length;
      if (avgVol < 1.5) s += 15;
      else if (avgVol < 3) s += 8;
      else if (avgVol < 5) s += 2;
      else if (avgVol > 7) s -= 10;
    }
    if (klines && klines.length >= 5) {
      const recent = klines.slice(-5);
      const avgVol = recent.reduce((sum, k) => sum + k.volume, 0) / 5;
      const last = recent[4];
      const priceUp = last.close > recent[0].close;
      if (priceUp && last.volume > avgVol * 1.2) s += 12;
      else if (!priceUp && last.volume < avgVol * 0.8) s += 6;
      else if (!priceUp && last.volume > avgVol * 1.5) s -= 12;
      else if (priceUp && last.volume < avgVol * 0.5) s -= 3;
    }
    if (quote.changePct > 0 && quote.changePct < 3) s += 8;
    else if (quote.changePct >= 3 && quote.changePct < 7) s += 4;
    else if (quote.changePct >= 7) s -= 5;
    else if (quote.changePct < -5) s -= 10;
    else if (quote.changePct < -2) s -= 3;
    return Math.max(0, Math.min(100, s));
  }
};

// ============================================================
// 4. DataAPI - 数据获取API
// ============================================================
const DataAPI = {
  /** 获取腾讯实时行情（支持批量） */
  async fetchQuotes(codes) {
    try {
      // 分离北交所和其他股票
      const bjCodes = codes.filter(c => c.startsWith('bj'));
      const otherCodes = codes.filter(c => !c.startsWith('bj'));
      const results = {};

      // 腾讯API获取非北交所股票
      if (otherCodes.length > 0) {
        const url = CONFIG.TENCENT_QUOTE + otherCodes.join(',');
        const resp = await fetch(url);
        const buffer = await resp.arrayBuffer();
        const text = Utils.gbkToUtf8(buffer);
        const lines = text.split(';').filter(l => l.includes('v_'));
        lines.forEach(line => {
          const codeMatch = line.match(/v_([a-z]{2}\d+)=/);
          if (codeMatch) {
            const parsed = Utils.parseTencentQuote(line);
            if (parsed) results[codeMatch[1]] = parsed;
          }
        });
      }

      // 北交所股票：先尝试腾讯，失败则用东方财富备用API
      for (const code of bjCodes) {
        try {
          const url = CONFIG.TENCENT_QUOTE + code;
          const resp = await fetch(url);
          const buffer = await resp.arrayBuffer();
          const text = Utils.gbkToUtf8(buffer);
          if (text.includes('~') && !text.includes('pv_none_match')) {
            const parsed = Utils.parseTencentQuote(text);
            if (parsed && parsed.price > 0) {
              parsed.code = code;
              results[code] = parsed;
              continue;
            }
          }
        } catch(e) { console.warn('[fetchQuotes] 腾讯API获取北交所失败:', code, e.message); }

        // 东方财富备用API
        try {
          const emCode = code.substring(2);
          const secid = '0.' + emCode;
          const emUrl = CONFIG.EM_QUOTE + '?secid=' + secid + '&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f170,f171';
          const resp = await fetch(emUrl);
          const data = await resp.json();
          if (data && data.data) {
            const d = data.data;
            const price = (d.f43 || 0) / 100;
            const prevClose = (d.f60 || 0) / 100;
            const change = (d.f171 || 0) / 100;
            const changePct = (d.f170 || 0) / 100;
            results[code] = {
              name: d.f58 || code,
              code: emCode,
              price: price,
              prevClose: prevClose,
              open: (d.f46 || 0) / 100,
              high: (d.f44 || 0) / 100,
              low: (d.f45 || 0) / 100,
              volume: d.f47 || 0,
              amount: (d.f48 || 0) / 10000,
              change: change,
              changePct: changePct,
              turnover: d.f168 || (d.f167 || 0) / 100,
              pe: (d.f162 || 0) / 100,
              pb: (d.f167 || 0) / 100,
              marketCap: (d.f116 || 0) / 100000000,
              circCap: (d.f117 || 0) / 100000000,
              amplitude: (d.f50 || 0) / 100,
              time: ''
            };
          }
        } catch(e) { console.warn('[fetchQuotes] 东方财富API获取北交所失败:', code, e.message); }
      }

      return results;
    } catch (e) {
      console.error('fetchQuotes error:', e);
      return {};
    }
  },

  /** 获取单只股票行情 */
  async fetchQuote(code) {
    const results = await this.fetchQuotes([code]);
    const q = results[code];
    if (q) {
      // 确保code字段包含市场前缀（腾讯API返回的code可能只是6位数字）
      q.code = code;
      // 设置marketCap单位为亿
      if (q.marketCap > 0 && q.marketCap < 1000) q.marketCap = q.marketCap; // 已经是亿
    }
    return q || null;
  },

  /** 获取日K线数据 */
  async fetchKline(code, count = 120) {
    try {
      // 先尝试腾讯K线API
      const url = `${CONFIG.TENCENT_KLINE}?param=${code},day,,,${count},qfq`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.data && data.data[code]) {
        const kdata = data.data[code].day || data.data[code].qfqday || [];
        if (kdata.length > 0) {
          return kdata.map(k => ({
            date: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5]
          }));
        }
      }

      // 北交所或其他股票腾讯无数据时，用东方财富K线备用
      if (code.startsWith('bj') || code.startsWith('sh') || code.startsWith('sz')) {
        const emCode = code.substring(2);
        let market = 1; // 沪市
        if (code.startsWith('sz')) market = 0;
        if (code.startsWith('bj')) market = 0;
        const secid = market + '.' + emCode;
        const emUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&lmt=${count}&end=20500101`;
        const emResp = await fetch(emUrl);
        const emData = await emResp.json();
        if (emData && emData.data && emData.data.klines) {
          return emData.data.klines.map(line => {
            const f = line.split(',');
            return {
              date: f[0], open: +f[1], close: +f[2], high: +f[3], low: +f[4],
              volume: +f[5], amount: +f[6]
            };
          });
        }
      }

      return [];
    } catch (e) {
      console.error('fetchKline error:', e);
      return [];
    }
  },

  /** 东方财富搜索股票 - 支持全类型股票 */
  async searchStock(keyword) {
    try {
      const url = `${CONFIG.EM_SEARCH}?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=20`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.QuotationCodeTable && data.QuotationCodeTable.Data) {
        return data.QuotationCodeTable.Data.map(item => {
          let prefix = 'sz';
          const code = item.Code;
          const mkt = item.MktNum;
          // 东方财富MktNum映射: 01=沪市, 02=深市, 0=北交所
          if (mkt === '01' || mkt === 1) prefix = 'sh';
          else if (mkt === '0' && code.startsWith('8')) prefix = 'bj';
          else if (mkt === '0' && code.startsWith('4')) prefix = 'bj';
          // 根据代码前缀自动判断
          else if (code.startsWith('6')) prefix = 'sh';
          else if (code.startsWith('0') || code.startsWith('3')) prefix = 'sz';
          else if (code.startsWith('8') || code.startsWith('4')) prefix = 'bj';
          else if (code.startsWith('5')) prefix = 'sh'; // ETF
          else if (code.startsWith('1')) prefix = 'sz'; // 可转债/ETF
          return {
            name: item.Name || code,
            code: code,
            market: prefix,
            fullName: `${item.Name || code}(${code})`,
            fullCode: prefix + code
          };
        }).filter(d => /^\d{6}$/.test(d.code));
      }
      return [];
    } catch (e) {
      console.error('searchStock error:', e);
      return [];
    }
  },

  /** 获取全市场股票排行（按成交额排序，取前N只） */
  async fetchMarketRanking(topN) {
    topN = topN || 300;
    try {
      // 东方财富全市场排行API：fs覆盖沪市主板+深市主板+中小板+创业板+科创板+北交所
      const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=' + topN + '&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81&fields=f2,f3,f4,f5,f6,f7,f8,f9,f12,f14,f15,f16,f17,f18,f20,f21,f23';
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.data && data.data.diff) {
        return data.data.diff.map(item => {
          const code = item.f12;
          let prefix = 'sz';
          if (code.startsWith('6')) prefix = 'sh';
          else if (code.startsWith('8') || code.startsWith('4')) prefix = 'bj';
          else if (code.startsWith('0') || code.startsWith('3')) prefix = 'sz';
          return {
            code: prefix + code,
            name: item.f14 || code,
            price: item.f2 || 0,
            changePct: item.f3 || 0,
            change: item.f4 || 0,
            volume: item.f5 || 0,
            amount: (item.f6 || 0) / 10000,
            amplitude: item.f7 || 0,
            turnover: item.f8 || 0,
            pe: item.f9 || 0,
            high: item.f15 || 0,
            low: item.f16 || 0,
            open: item.f17 || 0,
            prevClose: item.f18 || 0,
            marketCap: (item.f20 || 0) / 100000000,
            circCap: (item.f21 || 0) / 100000000,
            pb: item.f23 || 0
          };
        }).filter(d => d.price > 0 && d.name && !d.name.includes('ST'));
      }
      return [];
    } catch (e) {
      console.error('fetchMarketRanking error:', e);
      return [];
    }
  },

  /** 获取资金流向（近5日） */
  async fetchCapitalFlow(code) {
    try {
      const secid = code.startsWith('sh') ? `1.${code.substring(2)}` : `0.${code.substring(2)}`; // 北交所(sz/bj)均用market=0
      const url = `${CONFIG.EM_CAPITAL}?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&klt=101&lmt=5`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.data && data.data.klines) {
        return data.data.klines.map(line => {
          const f = line.split(',');
          return {
            date: f[0],
            mainIn: +f[1], // 主力净流入
            smallIn: +f[2], // 小单净流入
            medIn: +f[3], // 中单净流入
            bigIn: +f[4], // 大单净流入
            superIn: +f[5] // 超大单净流入
          };
        });
      }
      return [];
    } catch (e) {
      console.error('fetchCapitalFlow error:', e);
      return [];
    }
  },

  /** 获取公告新闻 */
  async fetchNews(code) {
    try {
      const stockCode = code.substring(2);
      const url = `${CONFIG.EM_NEWS}?cb=&sr=-1&page_size=10&page_index=1&ann_type=A&client_source=&stock_list=${stockCode}&f_node=0&s_node=0`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.data && data.data.list) {
        return data.data.list.map(item => ({
          title: item.title || '',
          time: item.notice_date || '',
          type: item.columns ? item.columns[0]?.column_name : '公告'
        }));
      }
      return [];
    } catch (e) {
      console.error('fetchNews error:', e);
      return [];
    }
  },

  /** 通过名称查找代码 */
  findCodeByName(name) {
    return STOCK_MAP[name] || null;
  },

  /** 搜索股票（本地映射 + API，支持模糊搜索） */
  async searchStockFull(keyword) {
    // 先查本地映射（支持模糊匹配：名称或代码部分匹配）
    const localResults = [];
    const kw = keyword.trim().toLowerCase();

    // 支持直接输入6位代码搜索
    if (/^\d{6}$/.test(kw)) {
      const prefixes = ['sh', 'sz', 'bj'];
      for (const prefix of prefixes) {
        const fullCode = prefix + kw;
        if (CODE_TO_NAME[fullCode]) {
          let market = prefix === 'sh' ? '上证' : prefix === 'sz' ? '深证' : '北交所';
          localResults.push({ name: CODE_TO_NAME[fullCode], code: kw, market, fullCode });
        }
      }
      // 即使本地没找到，也尝试通过API获取
      if (localResults.length === 0) {
        // 尝试三种前缀获取行情
        for (const prefix of ['sh', 'sz', 'bj']) {
          try {
            const fullCode = prefix + kw;
            const resp = await fetch(CONFIG.TENCENT_QUOTE + fullCode);
            const text = await resp.text();
            if (text.includes('~') && !text.includes('pv_none_match')) {
              const parts = text.split('~');
              const name = parts[1] || CODE_TO_NAME[fullCode] || kw;
              let market = prefix === 'sh' ? '上证' : prefix === 'sz' ? '深证' : '北交所';
              localResults.push({ name, code: kw, market, fullCode });
              break;
            }
          } catch(e) {}
        }
      }
    }

    // 本地模糊搜索
    Object.entries(STOCK_MAP).forEach(([name, code]) => {
      const nameLower = name.toLowerCase();
      const codeLower = code.toLowerCase();
      if (nameLower.includes(kw) || codeLower.includes(kw)) {
        let market = 'A股';
        if (code.startsWith('sh')) market = '上证';
        else if (code.startsWith('sz')) market = '深证';
        else if (code.startsWith('bj')) market = '北交所';
        else if (code.startsWith('hk')) market = '港股';
        else if (code.startsWith('us')) market = '美股';
        localResults.push({ name, code, market, fullCode: code });
      }
    });

    // 去重
    const seen = new Set();
    const deduped = [];
    localResults.forEach(r => {
      if (!seen.has(r.fullCode)) { seen.add(r.fullCode); deduped.push(r); }
    });
    localResults.length = 0;
    localResults.push(...deduped);

    // 再查东方财富API
    try {
      const apiResults = await this.searchStock(keyword);
      const codes = new Set(localResults.map(r => r.fullCode));
      apiResults.forEach(r => {
        if (!codes.has(r.fullCode)) {
          localResults.push({
            name: r.name, code: r.code,
            market: r.market === 'sh' ? '上证' : r.market === 'bj' ? '北交所' : '深证',
            fullCode: r.fullCode
          });
          codes.add(r.fullCode);
        }
      });
    } catch (e) {}

    return localResults;
  }
};

// ============================================================
// 5. Navigation - 页面导航（修复BUG：所有页面必须注册）
// ============================================================
const Navigation = {
  pages: {
    home: null,
    analysis: null,
    watchlist: null,
    screener: null,
    about: null,
    settings: null
  },
  currentPage: 'home',

  init() {
    // 注册所有页面元素
    Object.keys(this.pages).forEach(key => {
      this.pages[key] = document.getElementById(`page-${key}`);
    });
  },

  switchTo(pageName) {
    if (!this.pages[pageName]) {
      console.error(`页面 ${pageName} 未注册！`);
      return;
    }
    // 记录上一页
    if (this.currentPage !== pageName) {
      App._previousPage = this.currentPage;
    }
    // 隐藏所有页面
    Object.values(this.pages).forEach(p => {
      if (p) p.classList.remove('active');
    });
    // 显示目标页面
    this.pages[pageName].classList.add('active');
    // 更新导航高亮
    document.querySelectorAll('#app-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });
    this.currentPage = pageName;
    // 页面切换事件
    window.scrollTo(0, 0);
  }
};

// ============================================================
// 6. Market - 全球市场数据
// ============================================================
const Market = {
  async loadGlobalMarket() {
    const container = document.getElementById('globalMarket');
    try {
      // 腾讯API获取全球指数
      const codes = CONFIG.GLOBAL_INDICES.map(i => i.code);
      const url = CONFIG.TENCENT_QUOTE + codes.join(',');
      const resp = await fetch(url);
      const buffer = await resp.arrayBuffer();
      const text = Utils.gbkToUtf8(buffer);
      
      const lines = text.split(';').filter(l => l.includes('v_'));
      let html = '';
      CONFIG.GLOBAL_INDICES.forEach((item, idx) => {
        let price = '--', change = '--', cls = 'color-flat';
        const line = lines.find(l => l.includes(`v_${item.code}`));
        if (line) {
          const parsed = Utils.parseTencentQuote(line);
          if (parsed) {
            price = parsed.price.toFixed(2);
            const pct = parsed.changePct;
            cls = Utils.colorClass(pct);
            const sign = pct >= 0 ? '+' : '';
            change = `${sign}${pct.toFixed(2)}%`;
          }
        }
        html += `
          <div class="market-item">
            <div class="mi-name">${item.name}</div>
            <div class="mi-price ${cls}">${price}</div>
            <div class="mi-change ${cls}">${change}</div>
          </div>`;
      });
      container.innerHTML = html || '<div class="empty-tip">暂无数据</div>';
    } catch (e) {
      container.innerHTML = '<div class="empty-tip">全球市场数据加载失败</div>';
    }
  }
};

// ============================================================
// 7. Search - 股票搜索组件
// ============================================================
const Search = {
  debounceTimer: null,

  /** 通用搜索渲染 */
  async doSearch(keyword, containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!keyword || keyword.length < 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '<div class="loading-pulse"><span class="loading-spinner"></span>搜索中...</div>';

    let results = [];
    // 先尝试直接匹配代码
    const normalized = Utils.normalizeCode(keyword);
    if (normalized) {
      const quote = await DataAPI.fetchQuote(normalized);
      if (quote) {
        results = [{ name: quote.name, code: normalized, fullCode: normalized, market: normalized.startsWith('sh') ? '上证' : '深证' }];
      }
    }
    // 如果代码没匹配到，搜索名称
    if (results.length === 0) {
      results = await DataAPI.searchStockFull(keyword);
    }

    if (results.length === 0) {
      container.innerHTML = '<div class="empty-tip">未找到匹配股票</div>';
      return;
    }

    container.innerHTML = results.slice(0, 8).map(r => `
      <div class="search-result-item" data-code="${r.fullCode || r.code}" onclick="(${onSelect})('${r.fullCode || r.code}')">
        <div>
          <span class="sr-name">${r.name}</span>
          <span class="sr-code">${r.code}</span>
        </div>
        <span class="sr-market">${r.market || ''}</span>
      </div>
    `).join('');
  },

  /** 绑定输入事件 */
  bindInput(inputId, containerId, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.doSearch(input.value.trim(), containerId, onSelect);
      }, 300);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(this.debounceTimer);
        this.doSearch(input.value.trim(), containerId, onSelect);
      }
    });
  }
};

// ============================================================
// 8. SevenDimAnalyzer - 七维度评分引擎
// ============================================================
const SevenDimAnalyzer = {
  /** 计算七维度评分 */
  analyze(quote, klines, capitalFlow) {
    const fundamental = this.scoreFundamental(quote);
    const technical = this.scoreTechnical(klines, quote);
    const capital = this.scoreCapital(capitalFlow);
    const valuation = this.scoreValuation(quote);
    const sentiment = this.scoreSentiment(quote, klines);
    const scores = {
      fundamental, technical, capital, valuation, sentiment,
      message: this.scoreMessage(quote),
      macro: this.scoreMacro(),
      risk: this.scoreRisk(quote, klines, capitalFlow)
    };
    const total = fundamental * 0.30 + technical * 0.25 + capital * 0.20 + valuation * 0.15 + sentiment * 0.10;
    scores.total = Math.round(Math.max(0, Math.min(100, total)));
    scores.dims = { fundamental, technical, capital, valuation, sentiment };
    return scores;
  },

  scoreValuation(quote) {
    let score = 50;
    if (quote.pe > 0 && quote.pe < 10) score += 30;
    else if (quote.pe >= 10 && quote.pe < 18) score += 20;
    else if (quote.pe >= 18 && quote.pe < 30) score += 8;
    else if (quote.pe >= 30 && quote.pe < 50) score -= 8;
    else if (quote.pe >= 50 || quote.pe < 0) score -= 25;
    if (quote.pb > 0 && quote.pb < 1) score += 20;
    else if (quote.pb >= 1 && quote.pb < 2) score += 12;
    else if (quote.pb >= 2 && quote.pb < 3.5) score += 5;
    else if (quote.pb >= 3.5 && quote.pb < 6) score -= 8;
    else if (quote.pb >= 6 || quote.pb < 0) score -= 18;
    if (quote.marketCap > 800) score += 10;
    else if (quote.marketCap > 300) score += 5;
    else if (quote.marketCap < 50) score -= 10;
    return Math.max(0, Math.min(100, score));
  },

  /** 基本面评分 */
  scoreFundamental(quote) {
    let score = 50;
    // PE评分：合理区间10-25
    if (quote.pe > 0 && quote.pe < 15) score += 20;
    else if (quote.pe >= 15 && quote.pe < 25) score += 15;
    else if (quote.pe >= 25 && quote.pe < 40) score += 5;
    else if (quote.pe >= 40 || quote.pe < 0) score -= 15;
    // PB评分：合理区间1-3
    if (quote.pb > 0 && quote.pb < 1.5) score += 15;
    else if (quote.pb >= 1.5 && quote.pb < 3) score += 10;
    else if (quote.pb >= 3 && quote.pb < 5) score += 0;
    else if (quote.pb >= 5 || quote.pb < 0) score -= 10;
    // 市值评分：中大盘更稳定
    if (quote.marketCap > 500) score += 10;
    else if (quote.marketCap > 100) score += 5;
    else score -= 5;
    return Math.max(0, Math.min(100, score));
  },

  /** 技术面评分 */
  scoreTechnical(klines, quote) {
    if (!klines || klines.length < 20) return 50;
    let score = 50;
    const closes = klines.map(k => k.close);
    const current = quote.price;
    // 均线多头排列
    const ma5 = Utils.calcMA(closes, 5);
    const ma10 = Utils.calcMA(closes, 10);
    const ma20 = Utils.calcMA(closes, 20);
    const ma60 = Utils.calcMA(closes, 60);
    if (ma5 && ma10 && ma20) {
      if (ma5 > ma10 && ma10 > ma20) score += 20; // 多头排列
      else if (ma5 < ma10 && ma10 < ma20) score -= 15; // 空头排列
      if (current > ma5) score += 5;
      if (current > ma20) score += 5;
    }
    // MACD
    const macd = Utils.calcMACD(closes);
    if (macd.dif > macd.dea && macd.macd > 0) score += 10;
    else if (macd.dif < macd.dea && macd.macd < 0) score -= 10;
    // RSI
    const rsi = Utils.calcRSI(closes);
    if (rsi > 30 && rsi < 70) score += 5;
    else if (rsi >= 80) score -= 10;
    else if (rsi <= 20) score += 5; // 超卖反弹机会
    return Math.max(0, Math.min(100, score));
  },

  /** 资金面评分 */
  scoreCapital(capitalFlow) {
    if (!capitalFlow || capitalFlow.length === 0) return 50;
    let score = 50;
    const recent5 = capitalFlow.slice(-5);
    const totalFlow = recent5.reduce((sum, d) => sum + d.mainIn, 0);
    if (totalFlow > 0) {
      score += Math.min(30, totalFlow / 1e8 * 3);
    } else {
      score += Math.max(-30, totalFlow / 1e8 * 3);
    }
    // 连续流入天数
    let consecIn = 0;
    for (let i = recent5.length - 1; i >= 0; i--) {
      if (recent5[i].mainIn > 0) consecIn++;
      else break;
    }
    if (consecIn >= 3) score += 10;
    if (consecIn === 0) score -= 5;
    return Math.max(0, Math.min(100, score));
  },

  /** 情绪面评分 */
  scoreSentiment(quote, klines) {
    let score = 50;
    if (!quote) return score;
    // 换手率分析
    const turnover = quote.turnover || 0;
    if (turnover > 3 && turnover < 10) score += 10; // 活跃但不过热
    else if (turnover >= 10) score -= 5; // 过热
    else if (turnover < 1) score -= 5; // 冷清
    // 量价关系
    if (klines && klines.length >= 5) {
      const recent = klines.slice(-5);
      const avgVol = recent.reduce((s, k) => s + k.volume, 0) / 5;
      const lastVol = recent[recent.length - 1].volume;
      const priceUp = recent[recent.length - 1].close > recent[0].close;
      if (priceUp && lastVol > avgVol * 1.2) score += 10; // 放量上涨
      if (!priceUp && lastVol > avgVol * 1.5) score -= 10; // 放量下跌
    }
    // 涨跌幅情绪
    if (quote.changePct > 5) score -= 5; // 短期过热
    if (quote.changePct < -5) score += 5; // 超跌
    return Math.max(0, Math.min(100, score));
  },

  /** 消息面评分（基于基本面指标推算，无独立新闻API） */
  scoreMessage(quote) {
    let score = 55;
    // 通过价格和成交量异动推算消息面
    if (quote.changePct > 3) score += 10;
    if (quote.changePct < -3) score -= 10;
    if (quote.turnover > 8) score += 5; // 高关注度
    return Math.max(0, Math.min(100, score));
  },

  /** 宏观面评分（基于固定宏观数据） */
  scoreMacro() {
    let score = 50;
    const m = CONFIG.MACRO_DATA;
    // PMI分析
    if (m.pmi > 50) score += 15; // 扩张
    else if (m.pmi < 49) score -= 10; // 收缩
    // CPI温和
    if (m.cpi > 0 && m.cpi < 3) score += 10;
    // 利率偏低利好股市
    if (m.lpr_5y < 4) score += 10;
    // GDP增速
    if (m.gdp > 5) score += 10;
    return Math.max(0, Math.min(100, score));
  },

  /** 风险面评分（越低风险越高） */
  scoreRisk(quote, klines, capitalFlow) {
    let score = 70; // 从高分开始扣
    // PE过高风险
    if (quote.pe > 50) score -= 15;
    else if (quote.pe > 30) score -= 8;
    // 估值过高
    if (quote.pb > 5) score -= 10;
    // 资金流出风险
    if (capitalFlow && capitalFlow.length > 0) {
      const recent = capitalFlow.slice(-3);
      const totalOut = recent.reduce((s, d) => s + d.mainIn, 0);
      if (totalOut < -1e8) score -= 10;
    }
    // 技术破位风险
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const ma20 = Utils.calcMA(closes, 20);
      if (ma20 && quote.price < ma20 * 0.95) score -= 10;
    }
    return Math.max(0, Math.min(100, score));
  }
};

// ============================================================
// 9. DiagnosticEngine - 持仓诊断8大标准化模块
// ============================================================
const DiagnosticEngine = {
  /** 生成完整诊断报告 */
  generateReport(quote, klines, capitalFlow, news, scores) {
    const data = { quote, klines, capitalFlow, news, scores };
    return {
      mod1: this.module1_Financial(data),
      mod2: this.module2_Industry(data),
      mod3: this.module3_Capital(data),
      mod4: this.module4_Technical(data),
      mod5: this.module5_Risk(data),
      mod6: this.module6_Optimization(data),
      mod7: this.module7_RiskControl(data),
      mod8: this.module8_Operation(data),
      riskSummary: this.riskSummary(data)
    };
  },

  /** 模块1：财务基本面校验 */
  module1_Financial({ quote, klines, capitalFlow }) {
    const q = quote;
    let html = '';
    // 结论前置
    let conclusion = '';
    if (q.pe > 0 && q.pe < 20 && q.pb > 0 && q.pb < 2) {
      conclusion = '✅ 基本面质地良好，估值合理偏低，具备长期持有价值。';
    } else if (q.pe > 40 || q.pb > 5) {
      conclusion = '⚠️ 估值偏高，基本面支撑力度不足，存在估值回调风险。';
    } else {
      conclusion = '📊 基本面中规中矩，估值处于合理区间，需结合其他维度综合判断。';
    }
    html += `<div class="conclusion">${conclusion}</div>`;

    // 盈利趋势
    html += '<p><strong>【盈利质量】</strong></p>';
    if (q.pe > 0 && q.pe < 15) {
      html += `<p>当前市盈率(PE) ${q.pe.toFixed(1)} 倍，处于低估区间，盈利质量较好。</p>`;
    } else if (q.pe >= 15 && q.pe < 30) {
      html += `<p>当前市盈率(PE) ${q.pe.toFixed(1)} 倍，处于合理区间。</p>`;
    } else if (q.pe >= 30) {
      html += `<p>当前市盈率(PE) ${q.pe.toFixed(1)} 倍，估值偏高，需警惕业绩不及预期风险。</p>`;
    } else if (q.pe < 0) {
      html += `<p>当前市盈率为负，说明公司已亏损，基本面存在较大风险。</p>`;
    }
    html += `<p>市净率(PB) ${q.pb ? q.pb.toFixed(2) : '--'} 倍。`;
    if (q.pb > 0 && q.pb < 1.5) html += '估值偏低，安全边际较高。';
    else if (q.pb > 3) html += '估值偏高，需关注资产质量。';
    html += '</p>';

    // 市值与赛道
    html += '<p><strong>【赛道与壁垒】</strong></p>';
    const sector = CONFIG.SECTORS[Object.keys(CONFIG.SECTORS).find(k => k === quote.code + '')] ||
                   CONFIG.SECTORS[quote.code] || null;
    if (sector) {
      html += `<p>所属行业：${sector.name}（${sector.type}板块）。</p>`;
      const typeDesc = {
        '消费': '消费赛道现金流稳定，具有较强品牌壁垒和提价能力。',
        '金融': '金融板块受宏观利率政策影响较大，需关注息差变化。',
        '科技': '科技赛道成长性高，但技术迭代风险大，需关注研发投入。',
        '新能源': '新能源赛道受政策支持，但产能过剩风险需警惕。',
        '医疗': '医疗赛道长期需求刚性，但受集采政策影响较大。',
        '周期': '周期板块与宏观经济高度相关，需关注大宗商品价格走势。',
        '能源': '能源板块受国际油价影响，具有较强周期性。',
        '制造': '制造业受原材料和出口需求双重影响，需关注成本端变化。',
        '服务': '服务业恢复向好但竞争激烈，需关注市场份额变化。',
        '地产': '地产板块受调控政策影响大，行业整体承压。',
        '农业': '农业板块受周期和天气影响，业绩波动较大。',
        '基建': '基建板块受财政政策驱动，关注订单和回款情况。'
      };
      html += `<p>${typeDesc[sector.type] || '该行业需结合产业政策综合判断。'}</p>`;
    } else {
      html += '<p>未能识别行业分类，建议查阅公司年报确认主营业务。</p>';
    }

    // 经营现金流（通过换手率和成交额推算）
    html += '<p><strong>【经营现金流评估】</strong></p>';
    if (q.turnover > 5) {
      html += '<p>近期换手率较高，市场交投活跃，需关注是否有大资金出货迹象。</p>';
    } else {
      html += '<p>换手率处于正常水平，筹码相对稳定。</p>';
    }
    return html;
  },

  /** 模块2：行业政策与成长性评估 */
  module2_Industry({ quote }) {
    const sector = CONFIG.SECTORS[quote.code] || null;
    let html = '';
    let conclusion = '';

    if (!sector) {
      conclusion = '📊 行业信息不足，建议查阅公司官网和年报确认行业归属。';
      html += `<div class="conclusion">${conclusion}</div>`;
      html += '<p>无法获取准确的行业分类信息，建议结合公司年报中的主营业务构成进行分析。</p>';
      return html;
    }

    // 行业政策评估
    const policyMap = {
      '消费': { policy: '正面', desc: '促消费政策持续发力，内需扩容政策利好消费龙头。', ceiling: '行业天花板较高，消费升级趋势明确。', fit: '高' },
      '金融': { policy: '中性', desc: '利率市场化推进中，金融监管趋严，但稳增长政策利好信贷。', ceiling: '增长平稳，主要看息差和资产质量。', fit: '中' },
      '科技': { policy: '强正面', desc: '国产替代、AI产业政策持续加码，科技创新为国家战略。', ceiling: '成长空间巨大，但技术路线不确定。', fit: '高' },
      '新能源': { policy: '正面转中性', desc: '补贴政策退坡，但碳中和目标支撑长期需求，需关注产能过剩。', ceiling: '市场空间广阔，但竞争加剧。', fit: '中高' },
      '医疗': { policy: '中性偏负', desc: '集采常态化压制药企利润，但老龄化趋势支撑长期需求。', ceiling: '需求刚性强，创新药有突破空间。', fit: '中' },
      '周期': { policy: '中性', desc: '供给侧改革后行业集中度提升，关注大宗商品价格周期。', ceiling: '受经济周期影响大，天花板取决于宏观经济。', fit: '中' },
      '能源': { policy: '中性偏负', desc: '能源转型长期利空传统能源，但短期供给紧张支撑价格。', ceiling: '传统能源长期面临替代压力。', fit: '低' },
      '制造': { policy: '正面', desc: '制造强国战略推进，高端制造受政策支持。', ceiling: '取决于技术水平和国际竞争力。', fit: '中高' },
      '服务': { policy: '正面', desc: '疫后消费复苏，服务业PMI回暖。', ceiling: '市场空间大但竞争格局分散。', fit: '中' },
      '地产': { policy: '负面', desc: '房住不炒基调不变，行业深度调整中。', ceiling: '行业整体规模见顶回落。', fit: '低' },
      '农业': { policy: '正面', desc: '种业振兴、粮食安全政策加码。', ceiling: '受周期和天气影响大。', fit: '中' },
      '基建': { policy: '正面', desc: '稳增长政策发力，基建投资加速。', ceiling: '受财政空间和地方债务约束。', fit: '中高' }
    };

    const info = policyMap[sector.type] || { policy: '中性', desc: '行业政策环境一般。', ceiling: '行业增长趋稳。', fit: '中' };

    conclusion = `${info.policy === '强正面' ? '✅' : info.policy === '正面' ? '✅' : info.policy.includes('负') ? '⚠️' : '📊'} 行业政策环境：${info.policy}。产业政策契合度：${info.fit}。`;
    html += `<div class="conclusion">${conclusion}</div>`;

    html += '<p><strong>【产业政策影响】</strong></p>';
    html += `<p>${info.desc}</p>`;

    html += '<p><strong>【行业天花板】</strong></p>';
    html += `<p>${info.ceiling}</p>`;

    html += '<p><strong>【正/反向影响判断】</strong></p>';
    if (info.policy === '强正面' || info.policy === '正面') {
      html += `<p>当前产业政策对${sector.name}行业构成正向支撑，中长期发展逻辑清晰。但需关注政策执行力度和行业竞争格局变化。</p>`;
    } else if (info.policy.includes('负')) {
      html += `<p>当前政策环境对${sector.name}行业构成反向压力，行业面临转型阵痛。建议密切关注政策边际变化。</p>`;
    } else {
      html += `<p>政策对${sector.name}行业影响中性，行业更多依赖自身经营能力和市场竞争。</p>`;
    }
    return html;
  },

  /** 模块3：资金流向数据解读 */
  module3_Capital({ capitalFlow }) {
    let html = '';
    if (!capitalFlow || capitalFlow.length === 0) {
      html += '<div class="conclusion">📊 暂无资金流向数据，无法判断主力动向。</div>';
      html += '<p>建议通过东方财富、同花顺等平台查看资金流向详情。</p>';
      return html;
    }

    const recent5 = capitalFlow.slice(-5);
    const totalMain = recent5.reduce((s, d) => s + d.mainIn, 0);
    const totalSuper = recent5.reduce((s, d) => s + d.superIn, 0);
    const totalBig = recent5.reduce((s, d) => s + d.bigIn, 0);
    const totalSmall = recent5.reduce((s, d) => s + d.smallIn, 0);

    // 结论
    let conclusion = '';
    if (totalMain > 5e7) {
      conclusion = '✅ 近5日主力资金持续净流入，主力做多意愿较强。';
    } else if (totalMain < -5e7) {
      conclusion = '⚠️ 近5日主力资金大幅净流出，主力出货迹象明显，需高度警惕。';
    } else {
      conclusion = '📊 近5日主力资金流向中性，多空博弈较为均衡。';
    }
    html += `<div class="conclusion">${conclusion}</div>`;

    // 主力数据
    html += '<p><strong>【近5日主力资金数据】</strong></p>';
    recent5.forEach(d => {
      const dir = d.mainIn >= 0 ? '流入' : '流出';
      const cls = d.mainIn >= 0 ? 'color-up' : 'color-down';
      html += `<div class="metric-row">
        <span class="metric-label">${d.date}</span>
        <span class="metric-val ${cls}">${Utils.formatAmount(Math.abs(d.mainIn))} ${dir}</span>
      </div>`;
    });

    // 5日汇总
    html += '<p><strong>【5日汇总】</strong></p>';
    const mainDir = totalMain >= 0 ? '净流入' : '净流出';
    const mainCls = totalMain >= 0 ? 'color-up' : 'color-down';
    html += `<div class="metric-row">
      <span class="metric-label">主力净流向</span>
      <span class="metric-val ${mainCls}">${Utils.formatAmount(Math.abs(totalMain))} ${mainDir}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">超大单净流向</span>
      <span class="metric-val ${totalSuper >= 0 ? 'color-up' : 'color-down'}">${Utils.formatAmount(Math.abs(totalSuper))}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">大单净流向</span>
      <span class="metric-val ${totalBig >= 0 ? 'color-up' : 'color-down'}">${Utils.formatAmount(Math.abs(totalBig))}</span>
    </div>`;

    // 散户筹码分析
    html += '<p><strong>【散户筹码状态】</strong></p>';
    if (totalSmall > 0 && totalMain < 0) {
      html += '<p>⚠️ 散户净流入、主力净流出，典型的散户接盘格局，筹码从集中转向分散，后市看空。</p>';
    } else if (totalSmall < 0 && totalMain > 0) {
      html += '<p>✅ 散户净流出、主力净流入，筹码向主力集中，有利于后市拉升。</p>';
    } else {
      html += '<p>散户与主力流向同向，市场方向较为一致，需结合技术面判断。</p>';
    }

    // 多空意愿
    html += '<p><strong>【多空意愿判断】</strong></p>';
    let bullDays = recent5.filter(d => d.mainIn > 0).length;
    if (bullDays >= 4) {
      html += '<p>近5日有' + bullDays + '日主力净流入，多方力量占优，短期偏多。</p>';
    } else if (bullDays <= 1) {
      html += '<p>近5日仅' + bullDays + '日主力净流入，空方力量占优，短期偏空。</p>';
    } else {
      html += '<p>多空力量交替，市场处于震荡博弈阶段，方向不明朗。</p>';
    }
    return html;
  },

  /** 模块4：日线技术盘面解析 */
  module4_Technical({ quote, klines }) {
    let html = '';
    if (!klines || klines.length < 5) {
      html += '<div class="conclusion">📊 K线数据不足，无法进行技术面分析。</div>';
      return html;
    }

    const closes = klines.map(k => k.close);
    const current = quote.price;
    const ma5 = Utils.calcMA(closes, 5);
    const ma10 = Utils.calcMA(closes, 10);
    const ma20 = Utils.calcMA(closes, 20);
    const ma60 = Utils.calcMA(closes, 60);
    const macd = Utils.calcMACD(closes);
    const rsi = Utils.calcRSI(closes);
    const sr = Utils.calcSupportResistance(klines, current);

    // 结论
    let signal = '';
    if (ma5 > ma10 && ma10 > ma20 && current > ma5) signal = '✅ 技术面偏多，均线多头排列，短期趋势向好。';
    else if (ma5 < ma10 && ma10 < ma20 && current < ma5) signal = '⚠️ 技术面偏空，均线空头排列，短期趋势向下。';
    else signal = '📊 技术面信号混合，均线交织，短期方向不明确。';
    html += `<div class="conclusion">${signal}</div>`;

    // 支撑位与压力位
    html += '<p><strong>【关键价位】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">短期支撑位</span>
      <span class="metric-val key-price">${sr.support}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">短期压力位</span>
      <span class="metric-val key-price">${sr.resistance}</span>
    </div>`;
    if (ma20) {
      html += `<div class="metric-row">
        <span class="metric-label">MA20均线支撑</span>
        <span class="metric-val">${ma20.toFixed(2)}</span>
      </div>`;
    }
    if (ma60) {
      html += `<div class="metric-row">
        <span class="metric-label">MA60生命线</span>
        <span class="metric-val">${ma60.toFixed(2)}</span>
      </div>`;
    }

    // 短期K线逻辑
    html += '<p><strong>【短期K线逻辑】</strong></p>';
    const recent5 = klines.slice(-5);
    const upDays = recent5.filter(k => k.close > k.open).length;
    if (upDays >= 4) {
      html += '<p>近5日出现' + upDays + '根阳线，短期多头动能较强，但需警惕获利回吐压力。</p>';
    } else if (upDays <= 1) {
      html += '<p>近5日出现' + (5 - upDays) + '根阴线，短期空头占优，需关注下方支撑能否守住。</p>';
    } else {
      html += '<p>近5日K线阴阳交替，多空博弈激烈，方向选择临近。</p>';
    }

    // 均线状态
    html += '<p><strong>【均线状态】</strong></p>';
    if (ma5 && ma10 && ma20) {
      if (ma5 > ma10 && ma10 > ma20) {
        html += '<p>MA5 > MA10 > MA20，均线多头排列，趋势向上。</p>';
      } else if (ma5 < ma10 && ma10 < ma20) {
        html += '<p>MA5 < MA10 < MA20，均线空头排列，趋势向下。</p>';
      } else {
        html += '<p>均线交织缠绕，短期方向不明，等待突破方向确认。</p>';
      }
    }

    // MACD
    html += '<p><strong>【MACD指标】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">DIF</span>
      <span class="metric-val">${macd.dif.toFixed(3)}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">DEA</span>
      <span class="metric-val">${macd.dea.toFixed(3)}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">MACD柱</span>
      <span class="metric-val ${macd.macd >= 0 ? 'color-up' : 'color-down'}">${macd.macd.toFixed(3)}</span>
    </div>`;
    if (macd.dif > macd.dea) {
      html += '<p>DIF位于DEA上方，MACD金叉状态，短期偏多。</p>';
    } else {
      html += '<p>DIF位于DEA下方，MACD死叉状态，短期偏空。</p>';
    }

    // RSI
    html += '<p><strong>【RSI指标】</strong></p>';
    html += `<p>RSI(14) = ${rsi.toFixed(1)}。`;
    if (rsi > 80) html += '⚠️ 进入超买区域，短期回调概率较大。</p>';
    else if (rsi > 60) html += '处于偏强区域，多头仍占优。</p>';
    else if (rsi > 40) html += '处于中性区域，多空均衡。</p>';
    else if (rsi > 20) html += '处于偏弱区域，空头占优。</p>';
    else html += '⚠️ 进入超卖区域，存在技术性反弹机会，但需等待止跌信号。</p>';
    return html;
  },

  /** 模块5：全维度风险量化排查 */
  module5_Risk({ quote, klines, capitalFlow }) {
    const risks = [];
    let html = '';

    // 1. 业绩暴雷风险
    if (quote.pe < 0) {
      risks.push({ level: 'high', title: '业绩亏损风险', desc: '当前PE为负，公司处于亏损状态，存在ST或退市风险。', transmit: '亏损→可能被ST→股价大幅下跌→投资者本金损失' });
    } else if (quote.pe > 60) {
      risks.push({ level: 'medium', title: '高估值回调风险', desc: `PE高达${quote.pe.toFixed(1)}倍，远超行业平均水平，业绩不达预期将面临戴维斯双杀。`, transmit: '高估值→业绩不达预期→估值+业绩双杀→股价大幅回调' });
    }

    // 2. 行业竞争风险
    const sector = CONFIG.SECTORS[quote.code];
    if (sector && ['消费', '科技', '新能源'].includes(sector.type)) {
      if (quote.marketCap && quote.marketCap < 100) {
        risks.push({ level: 'medium', title: '行业竞争加剧风险', desc: `作为${sector.name}中小企业，面临行业龙头挤压风险。`, transmit: '竞争加剧→市场份额下降→营收增长放缓→利润承压' });
      }
    }

    // 3. 政策变动风险
    if (sector) {
      if (['地产', '教育', '游戏'].includes(sector.type)) {
        risks.push({ level: 'high', title: '政策监管风险', desc: `${sector.name}行业受政策监管影响大，政策变化可能导致行业基本面恶化。`, transmit: '政策收紧→行业规模收缩→企业盈利下滑→股价下跌' });
      }
    }

    // 4. 估值回调风险
    if (quote.pb > 5) {
      risks.push({ level: 'medium', title: '估值偏高回调风险', desc: `PB=${quote.pb.toFixed(1)}倍，显著高于行业均值，一旦市场情绪转冷，估值面临收缩。`, transmit: '高PB→市场风险偏好下降→估值中枢下移→股价下跌' });
    }

    // 5. 资金出逃风险
    if (capitalFlow && capitalFlow.length > 0) {
      const recent3 = capitalFlow.slice(-3);
      const totalOut = recent3.reduce((s, d) => s + d.mainIn, 0);
      if (totalOut < -1e8) {
        risks.push({ level: 'high', title: '主力资金出逃风险', desc: `近3日主力净流出${Utils.formatAmount(Math.abs(totalOut))}，大资金离场信号明确。`, transmit: '主力出货→抛压增大→股价承压→技术破位→散户恐慌抛售' });
      }
    }

    // 6. 技术破位风险
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const ma20 = Utils.calcMA(closes, 20);
      const ma60 = Utils.calcMA(closes, 60);
      if (ma20 && quote.price < ma20 * 0.95) {
        risks.push({ level: 'medium', title: '技术面破位风险', desc: `股价跌破MA20均线(${ma20.toFixed(2)})超5%，技术形态走坏。`, transmit: '技术破位→止损盘涌出→加速下跌→更低支撑位测试' });
      }
      if (ma60 && quote.price < ma60) {
        risks.push({ level: 'medium', title: '跌破长期均线风险', desc: `股价在MA60(${ma60.toFixed(2)})下方运行，中长期趋势偏弱。`, transmit: '跌破生命线→中期趋势转空→机构减仓→筹码松动' });
      }
    }

    // 渲染
    if (risks.length === 0) {
      html += '<div class="conclusion">✅ 未发现重大风险信号，各维度指标正常。</div>';
      html += '<p>当前未发现明显风险因子，但仍需保持关注市场整体环境变化。</p>';
    } else {
      const highCount = risks.filter(r => r.level === 'high').length;
      if (highCount >= 2) {
        html += '<div class="conclusion">🚨 检测到多个高风险信号，建议降低仓位或离场观望！</div>';
      } else if (highCount >= 1) {
        html += '<div class="conclusion">⚠️ 检测到高风险信号，建议密切关注并做好风控准备。</div>';
      } else {
        html += '<div class="conclusion">📊 存在部分中等风险，需保持警惕。</div>';
      }
      risks.forEach(r => {
        const levelText = r.level === 'high' ? '高风险' : r.level === 'medium' ? '中风险' : '低风险';
        const levelCls = `risk-${r.level}`;
        html += `<div class="risk-item">
          <p><strong>${r.title}</strong> <span class="risk-level ${levelCls}">${levelText}</span></p>
          <p style="color:var(--text-secondary);margin-top:4px">${r.desc}</p>
          <p style="font-size:12px;color:var(--accent-orange);margin-top:4px">传导逻辑：${r.transmit}</p>
        </div>`;
      });
    }
    return { html, risks };
  },

  /** 模块6：持仓优化处置方案 */
  module6_Optimization(data) {
    const { quote, klines, scores } = data;
    const totalScore = scores.total;
    let html = '';

    // 量化评分判断
    let action = '';
    let actionCls = '';
    let detail = '';

    if (totalScore >= 70) {
      action = '长期保留';
      actionCls = 'action-hold';
      detail = '量化评分较高，基本面和技术面均表现良好，建议长期持有，耐心等待价值回归。';
    } else if (totalScore >= 40) {
      action = '逢高减仓';
      actionCls = 'action-reduce';
      detail = '量化评分一般，存在一定风险因子，建议在反弹时适当减仓，降低持仓成本和风险敞口。';
    } else {
      action = '全部清仓';
      actionCls = 'action-sell';
      detail = '量化评分偏低，风险因子较多，建议果断清仓离场，避免更大损失。';
    }

    html += `<div class="conclusion">🎯 处置建议：<span class="action-tag ${actionCls}">${action}</span></div>`;
    html += `<p>${detail}</p>`;

    html += '<p><strong>【评分依据】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">量化评分</span>
      <span class="metric-val" style="color:${Utils.scoreColor(totalScore)}">${totalScore}分</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">评分等级</span>
      <span class="metric-val">${Utils.scoreLevel(totalScore)}</span>
    </div>`;

    html += '<p><strong>【处置逻辑】</strong></p>';
    if (totalScore >= 70) {
      html += '<p>✅ 基本面扎实（PE/PB合理）+ 技术面趋势向好 + 资金面主力流入 → 持有逻辑成立。</p>';
      html += '<p>操作建议：维持现有仓位，设好止损线，不轻易下车。回调至支撑位可加仓。</p>';
    } else if (totalScore >= 40) {
      html += '<p>📊 部分指标出现预警信号，虽不致命但需要控制风险。</p>';
      html += '<p>操作建议：在股价反弹至压力位附近减仓1/3~1/2，降低持仓成本。剩余仓位严格设止损。</p>';
    } else {
      html += '<p>⚠️ 多项指标亮红灯，继续持有风险收益比不佳。</p>';
      html += '<p>操作建议：尽快逢高清仓，不要补仓摊低成本（越补越亏的风险大于摊低成本的机会）。等趋势企稳后再考虑重新介入。</p>';
    }
    return html;
  },

  /** 模块7：统一标准化风控指标 */
  module7_RiskControl({ quote, klines }) {
    let html = '';
    const current = quote.price;
    const sr = Utils.calcSupportResistance(klines, current);

    // 刚性止损价
    const stopLoss = Math.min(sr.support, current * 0.92);
    const stopLossPct = ((stopLoss - current) / current * 100).toFixed(1);

    html += '<p><strong>【刚性止损价】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">止损价</span>
      <span class="metric-val key-price">${stopLoss.toFixed(2)}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">止损幅度</span>
      <span class="metric-val color-down">${stopLossPct}%</span>
    </div>`;
    html += '<p style="font-size:12px;color:var(--text-secondary)">说明：取支撑位与-8%中的较低值，一旦触及必须执行止损，不抱侥幸心理。</p>';

    // 单票仓位上限
    html += '<p><strong>【单票仓位上限】</strong></p>';
    let maxPosition = 20;
    if (quote.marketCap && quote.marketCap > 500) maxPosition = 25;
    if (quote.pe > 40 || quote.pb > 5) maxPosition = Math.min(maxPosition, 15);
    html += `<div class="metric-row">
      <span class="metric-label">建议最大仓位</span>
      <span class="metric-val">${maxPosition}%</span>
    </div>`;
    html += '<p style="font-size:12px;color:var(--text-secondary)">说明：单只股票不建议超过总资金的20%，高估值个股建议降至15%以下。</p>';

    // 总仓位管控
    html += '<p><strong>【总仓位管控】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">建议总仓位</span>
      <span class="metric-val">50%-70%</span>
    </div>`;
    html += '<p style="font-size:12px;color:var(--text-secondary)">说明：当前市场环境下，建议总仓位控制在50%-70%，保留30%-50%现金应对系统性风险。</p>';

    // 核心数值汇总
    html += '<p><strong>【核心风控数值汇总】</strong></p>';
    html += `<div class="metric-row">
      <span class="metric-label">刚性止损价</span>
      <span class="metric-val key-price">${stopLoss.toFixed(2)}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">短期支撑位</span>
      <span class="metric-val key-price">${sr.support}</span>
    </div>`;
    html += `<div class="metric-row">
      <span class="metric-label">短期压力位</span>
      <span class="metric-val key-price">${sr.resistance}</span>
    </div>`;
    return html;
  },

  /** 模块8：分场景实操操作指引 */
  module8_Operation({ quote, klines }) {
    let html = '';
    const current = quote.price;
    const sr = Utils.calcSupportResistance(klines, current);
    const stopLoss = Math.min(sr.support, current * 0.92);

    // 场景1：空仓待入
    html += '<div class="scenario-block">';
    html += '<div class="scenario-title">📌 场景一：空仓待入（尚未买入）</div>';
    if (current <= sr.support * 1.02) {
      html += '<p>✅ 当前价格接近支撑位，可以考虑试探性建仓。</p>';
      html += `<p>建仓价位：${(current * 0.98).toFixed(2)} - ${current.toFixed(2)}</p>`;
      html += `<p>首次仓位：不超过计划仓位的1/3</p>`;
      html += `<p>止损设置：${stopLoss.toFixed(2)}（跌破立即止损）</p>`;
    } else if (current >= sr.resistance * 0.98) {
      html += '<p>⚠️ 当前价格接近压力位，不建议追高，等待回调至支撑位附近再考虑入场。</p>';
      html += `<p>理想买入区间：${(sr.support * 1.01).toFixed(2)} - ${(sr.support * 1.05).toFixed(2)}</p>`;
    } else {
      html += '<p>📊 当前价格处于中间位置，可小仓位试探，留足资金等待回调加仓或突破追入。</p>';
      html += `<p>首次仓位：不超过计划仓位的1/4</p>`;
    }
    html += '</div>';

    // 场景2：持仓浮盈
    html += '<div class="scenario-block">';
    html += '<div class="scenario-title">📌 场景二：持仓浮盈（已有盈利）</div>';
    html += `<p>✅ 持仓处于盈利状态，建议分批锁定利润。</p>`;
    html += `<p>操作方案：</p>`;
    html += `<p>① 股价到达压力位(${sr.resistance})附近 → 减仓1/3</p>`;
    html += `<p>② 将止损价上移至成本价上方 → 保本止损</p>`;
    html += `<p>③ 剩余仓位继续持有，趋势不破不下车</p>`;
    html += `<p>动态止损：当盈利超过10%时，止损价上移至成本价+5%位置</p>`;
    html += '</div>';

    // 场景3：深度套牢
    html += '<div class="scenario-block">';
    html += '<div class="scenario-title">📌 场景三：深度套牢（亏损超15%）</div>';
    const lossPct = -15; // 假设场景
    if (current > stopLoss) {
      html += `<p>⚠️ 持仓处于亏损状态，需冷静分析，避免情绪化操作。</p>`;
      html += `<p>操作方案：</p>`;
      html += `<p>① 评估持仓逻辑是否改变：如基本面恶化，果断止损</p>`;
      html += `<p>② 如仅因短期波动导致浮亏，可在支撑位(${sr.support})附近小幅补仓摊低成本</p>`;
      html += `<p>③ 补仓量不超过原仓位的1/3，避免越补越多</p>`;
      html += `<p>④ 严格止损线：${stopLoss.toFixed(2)}，跌破必须离场</p>`;
      html += `<p>⚠️ 严禁：在下跌趋势中不断补仓摊低成本，这是散户最大亏损根源。</p>`;
    } else {
      html += `<p>🚨 已跌破止损价(${stopLoss.toFixed(2)})，建议立即止损离场！</p>`;
      html += `<p>不要心存幻想，纪律比盈利更重要。留得青山在，不怕没柴烧。</p>`;
    }
    html += '</div>';
    return html;
  },

  /** 风险汇总清单 */
  riskSummary({ quote, klines, capitalFlow }) {
    const risks = [];
    // 汇总所有潜在下跌风险
    if (quote.pe > 40) risks.push(`高估值风险：PE=${quote.pe.toFixed(1)}，远超合理水平`);
    if (quote.pe < 0) risks.push('业绩亏损风险：公司处于亏损状态');
    if (quote.pb > 5) risks.push(`高PB风险：PB=${quote.pb.toFixed(1)}，资产溢价过高`);
    if (capitalFlow && capitalFlow.length > 0) {
      const r3 = capitalFlow.slice(-3).reduce((s, d) => s + d.mainIn, 0);
      if (r3 < -5e7) risks.push(`资金出逃：近3日主力净流出${Utils.formatAmount(Math.abs(r3))}`);
    }
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const ma20 = Utils.calcMA(closes, 20);
      if (ma20 && quote.price < ma20) risks.push(`均线压力：股价在MA20(${ma20.toFixed(2)})下方`);
      const rsi = Utils.calcRSI(closes);
      if (rsi > 80) risks.push(`RSI超买：RSI=${rsi.toFixed(0)}，短期回调概率大`);
    }
    const sector = CONFIG.SECTORS[quote.code];
    if (sector && ['地产', '教育'].includes(sector.type)) risks.push(`政策风险：${sector.name}行业监管趋严`);
    if (quote.turnover > 15) risks.push(`换手率过高：${quote.turnover.toFixed(1)}%，筹码松动`);
    if (quote.changePct < -5) risks.push(`短期大跌：跌幅${quote.changePct.toFixed(1)}%，可能继续探底`);

    let html = '';
    if (risks.length === 0) {
      html += '<p style="color:var(--accent-green)">✅ 当前未检测到明显的潜在下跌风险因子。</p>';
      html += '<p style="font-size:12px;color:var(--text-secondary)">但仍需持续关注大盘走势、行业政策变化和公司基本面动态。</p>';
    } else {
      html += `<p style="color:var(--accent-red);font-weight:700">共检测到 ${risks.length} 项潜在下跌风险：</p>`;
      risks.forEach((r, i) => {
        html += `<p style="padding:6px 0;border-bottom:1px dashed var(--border-color)">
          <span style="color:var(--accent-red);font-weight:700">风险${i + 1}：</span>${r}
        </p>`;
      });
    }
    return html;
  }
};

// ============================================================
// 10. Screener - 智能选股引擎
// ============================================================
const Screener = {
  results: [],

  /** 运行选股 */
  async run(strategy) {
    const container = document.getElementById('screenerResults');
    const infoEl = document.getElementById('screenerInfo');
    const card = document.getElementById('screenerResultCard');
    
    container.innerHTML = '<div class="loading-pulse"><span class="loading-spinner"></span>正在获取全市场数据并多维筛选...</div>';
    card.style.display = 'block';
    infoEl.textContent = '';

    // 从全市场获取成交额排行前300只股票
    const marketRanking = await DataAPI.fetchMarketRanking(300);
    if (!marketRanking || marketRanking.length === 0) {
      container.innerHTML = '<div class="empty-tip">全市场数据获取失败，请刷新重试</div>';
      return;
    }
    
    // 将排行数据转为quotes格式
    const allQuotes = {};
    marketRanking.forEach(item => {
      allQuotes[item.code] = item;
    });
    
    infoEl.textContent = '已从全市场 ' + marketRanking.length + ' 只活跃股票中筛选';

    // 计算市值排名（用于龙头判断）
    const allByCap = Object.entries(allQuotes)
      .filter(([,q]) => q.price > 0 && q.marketCap > 0)
      .sort((a, b) => b[1].marketCap - a[1].marketCap);
    const capRankMap = {};
    allByCap.forEach(([code], idx) => { capRankMap[code] = idx + 1; });
    const totalStocks = allByCap.length;

    // 多维筛选
    const candidates = [];
    Object.entries(allQuotes).forEach(([code, q]) => {
      if (q.name && (q.name.includes('ST') || q.name.includes('*ST'))) return;
      if (!q.price || q.price <= 0 || q.volume <= 0) return;
      if (q.amount < 5000) return;

      let score = 50;
      const pe = q.pe || 999;
      const pb = q.pb || 999;
      const sector = CONFIG.SECTORS[code] || { name: '未知', type: '服务' };
      const cycle = CONFIG.INDUSTRY_CYCLE[sector.type] || 'mature';
      const globalCoeff = CONFIG.INDUSTRY_GLOBAL[sector.type] || 0.3;

      // === 新增维度标签 ===
      const tags = [];

      // --- 维度1: 行业周期判断 ---
      let cycleScore = 0;
      if (cycle === 'rising') { cycleScore = 12; tags.push('📈行业上升期'); }
      else if (cycle === 'cyclical_up') { cycleScore = 8; tags.push('🔄周期上行'); }
      else if (cycle === 'mature') { cycleScore = 4; tags.push('⏸️行业成熟期'); }
      else if (cycle === 'cyclical_down') { cycleScore = -2; tags.push('🔻周期下行'); }
      else if (cycle === 'declining') { cycleScore = -8; tags.push('📉行业下行'); }

      // --- 维度2: 龙头企业识别 ---
      let leaderScore = 0;
      const capRank = capRankMap[code] || totalStocks;
      const capPercentile = capRank / totalStocks;
      if (capPercentile <= 0.1) { leaderScore = 15; tags.push('🏆行业龙头'); }
      else if (capPercentile <= 0.2) { leaderScore = 10; tags.push('🥇头部企业'); }
      else if (capPercentile <= 0.4) { leaderScore = 5; tags.push('🥈中坚力量'); }
      else { leaderScore = 0; }

      // --- 维度3: 核心技术评估（研发投入代理：PE合理+市值大=有研发投入能力） ---
      let techScore = 0;
      if (sector.type === '科技' || sector.type === '新能源' || sector.type === '医疗') {
        if (pe > 0 && pe < 40 && q.marketCap > 200) { techScore = 12; tags.push('🔬技术壁垒强'); }
        else if (pe > 0 && pe < 60 && q.marketCap > 100) { techScore = 8; tags.push('💡技术型企业'); }
        else if (q.marketCap > 50) { techScore = 4; tags.push('🔧有一定技术'); }
        else { techScore = 0; }
      } else {
        // 非科技行业，技术评分较低但有基础分
        if (pe > 0 && pe < 20 && q.marketCap > 300) { techScore = 6; tags.push('🏭工艺成熟'); }
        else { techScore = 2; }
      }

      // --- 维度4: 全球化程度 ---
      let globalScore = Math.round(globalCoeff * 10);
      if (globalCoeff >= 0.7) tags.push('🌍全球化布局');
      else if (globalCoeff >= 0.5) tags.push('🌐有海外业务');
      else if (globalCoeff >= 0.3) tags.push('🏠以国内为主');
      else tags.push('🏘️本地化企业');

      // --- 维度5: 财务稳健性 ---
      let financeScore = 0;
      if (pe > 0 && pe < 20) financeScore += 8;
      else if (pe > 0 && pe < 35) financeScore += 4;
      else if (pe >= 60 || pe < 0) financeScore -= 5;
      if (pb > 0 && pb < 2) financeScore += 6;
      else if (pb >= 5) financeScore -= 4;
      // 换手率稳定（代表机构认可）
      if (q.turnover > 0.5 && q.turnover < 8) financeScore += 4;
      // 涨跌幅适中（不暴涨暴跌=稳健）
      if (Math.abs(q.changePct) < 3) financeScore += 3;
      if (q.marketCap > 500) financeScore += 4;
      if (financeScore >= 15) tags.push('💎财务稳健');
      else if (financeScore >= 8) tags.push('✅财务正常');
      else if (financeScore < 0) tags.push('⚠️财务风险');

      // === 原有策略评分 ===
      if (strategy === 'quality' || strategy === 'balanced') {
        if (pe > 0 && pe < 25) score += 15;
        else if (pe >= 25) score -= 10;
        if (pb > 0 && pb < 3) score += 10;
        else if (pb >= 5) score -= 10;
        if (q.marketCap > 300) score += 10;
        if (q.turnover > 1 && q.turnover < 10) score += 5;
      }

      if (strategy === 'value' || strategy === 'balanced') {
        if (pe > 0 && pe < 15) score += 15;
        else if (pe > 0 && pe < 30) score += 8;
        if (pb > 0 && pb < 2) score += 10;
        if (Math.abs(q.changePct) < 3) score += 5;
      }

      // === 叠加新维度得分（加权） ===
      score += cycleScore + leaderScore + techScore + globalScore + financeScore;

      candidates.push({
        code, name: q.name, price: q.price,
        change: q.changePct, pe, pb,
        marketCap: q.marketCap,
        score: Math.round(score),
        sector: sector.name,
        sectorType: sector.type,
        cycle, tags,
        dimScores: {
          cycle: cycleScore, leader: leaderScore, tech: techScore,
          global: globalScore, finance: financeScore
        }
      });
    });

    // 排序
    candidates.sort((a, b) => b.score - a.score);
    this.results = candidates.slice(0, 30);

    // 渲染
    infoEl.textContent = `全市场 ${Object.keys(allQuotes).length} 只活跃股中，基于行业周期·龙头地位·技术壁垒·全球化·财务稳健 五维精选 ${this.results.length} 只优质标的`;
    
    if (this.results.length === 0) {
      container.innerHTML = '<div class="empty-tip">当前无符合条件的股票</div>';
      return;
    }

    container.innerHTML = this.results.map((s, i) => {
      const tagsHtml = s.tags.slice(0, 3).map(t => '<span class="sc-tag">' + t + '</span>').join('');
      return `
      <div class="screener-item screener-item-v2" onclick="App.analyzeStock('${s.code}')">
        <div class="sc-rank">${i + 1}</div>
        <div class="sc-info">
          <div class="sc-name">${s.name}</div>
          <div class="sc-code">${s.code} · ${s.sector}</div>
          <div class="sc-tags">${tagsHtml}</div>
        </div>
        <div class="sc-metrics">
          <div class="sc-metric">
            <div class="sc-metric-val ${Utils.colorClass(s.change)}">${s.change > 0 ? '+' : ''}${s.change.toFixed(2)}%</div>
            <div class="sc-metric-label">涨跌</div>
          </div>
          <div class="sc-metric">
            <div class="sc-metric-val">${s.pe > 0 ? s.pe.toFixed(1) : '--'}</div>
            <div class="sc-metric-label">PE</div>
          </div>
          <div class="sc-metric">
            <div class="sc-metric-val">${s.pb > 0 ? s.pb.toFixed(2) : '--'}</div>
            <div class="sc-metric-label">PB</div>
          </div>
        </div>
        <div class="sc-score">
          <div class="sc-score-label">量化评分</div>
          <div class="sc-score-val" style="color:${Utils.scoreColor(s.score)}">${s.score}</div>
          <div class="sc-score-stars">${Utils.scoreLevel(s.score)}</div>
        </div>
      </div>`;
    }).join('');
  }
};

// ============================================================
// 11. Watchlist - 自选股管理（增强版：评估信息+排序）
// ============================================================
const Watchlist = {
  STORAGE_KEY: 'zhigu_watchlist',
  // 排序状态
  sortKey: 'score_desc', // 默认按量化评分降序
  // 缓存评估数据 { code: { score, advice, vwap, quote } }
  _cache: {},

  /** 获取自选股列表 */
  getList() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch { return []; }
  },

  /** 保存自选股列表 */
  save(list) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
  },

  /** 添加自选股 */
  add(code) {
    const list = this.getList();
    if (list.includes(code)) {
      Utils.toast('已在自选股中');
      return false;
    }
    list.push(code);
    this.save(list);
    // 记录添加时间
    this._saveAddedAt(code);
    Utils.toast('已添加到自选股');
    App.setDirty(true);
    return true;
  },

  /** 删除自选股 */
  remove(code) {
    let list = this.getList();
    list = list.filter(c => c !== code);
    this.save(list);
    delete this._cache[code];
    Utils.toast('已从自选股移除');
    App.setDirty(true);
  },

  /** 检查是否在自选股中 */
  has(code) {
    return this.getList().includes(code);
  },

  /** 快速评估（简化版七维度，用于列表展示） */
  quickScore(quote, klines) {
    return Utils.fiveDimScore(quote, klines);
  },

  /** 根据评分生成建议操作 */
  getAdvice(score) {
    if (score >= 70) return { text: '持有/加仓', icon: '✅', cls: 'advice-buy' };
    if (score >= 55) return { text: '逢低建仓', icon: '📈', cls: 'advice-wait' };
    if (score >= 40) return { text: '观望为主', icon: '📊', cls: 'advice-hold' };
    if (score >= 25) return { text: '减仓观望', icon: '⚠️', cls: 'advice-sell' };
    return { text: '回避/止损', icon: '🚫', cls: 'advice-avoid' };
  },

  /** 计算筹码成本（20日VWAP） */
  calcChipCost(klines) {
    if (!klines || klines.length < 5) return 0;
    const slice = klines.slice(-20);
    let totalAmt = 0, totalVol = 0;
    slice.forEach(k => {
      const price = (k.open + k.high + k.low + k.close) / 4;
      totalAmt += price * k.volume;
      totalVol += k.volume;
    });
    return totalVol > 0 ? +(totalAmt / totalVol).toFixed(2) : 0;
  },

  /** 切换排序方式（支持点击同一按钮切换升降序） */
  setSort(key) {
    // 如果点击的是当前排序字段，切换升降序
    const baseKey = key.replace(/_(asc|desc)$/, '');
    const currentBase = this.sortKey.replace(/_(asc|desc)$/, '');
    if (baseKey === currentBase && this.sortKey.endsWith('_desc')) {
      this.sortKey = baseKey + '_asc';
    } else if (baseKey === currentBase && this.sortKey.endsWith('_asc')) {
      this.sortKey = baseKey + '_desc';
    } else {
      this.sortKey = key;
    }
    this.render();
  },

  /** 获取股票添加时间 */
  getAddedAt(code) {
    try {
      const meta = JSON.parse(localStorage.getItem('zhigu_watchlist_meta') || '{}');
      return meta[code] || 0;
    } catch { return 0; }
  },

  /** 保存股票添加时间 */
  _saveAddedAt(code) {
    try {
      const meta = JSON.parse(localStorage.getItem('zhigu_watchlist_meta') || '{}');
      if (!meta[code]) {
        meta[code] = Date.now();
        localStorage.setItem('zhigu_watchlist_meta', JSON.stringify(meta));
      }
    } catch {}
  },

  /** 对数据进行排序 */
  applySort(items) {
    const key = this.sortKey;
    return items.sort((a, b) => {
      // 无行情的排到最后
      if (a.noQuote && !b.noQuote) return 1;
      if (!a.noQuote && b.noQuote) return -1;
      if (key === 'score_desc') return (b.score || 0) - (a.score || 0);
      if (key === 'score_asc') return (a.score || 0) - (b.score || 0);
      if (key === 'name') return (a.name || '').localeCompare(b.name || '', 'zh-CN');
      if (key === 'cost_desc') return (b.vwap || 0) - (a.vwap || 0);
      if (key === 'cost_asc') return (a.vwap || 0) - (b.vwap || 0);
      if (key === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (key === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (key === 'change_desc') return (b.changePct || 0) - (a.changePct || 0);
      if (key === 'change_asc') return (a.changePct || 0) - (b.changePct || 0);
      if (key === 'added_desc') return (b.addedAt || 0) - (a.addedAt || 0);
      if (key === 'added_asc') return (a.addedAt || 0) - (b.addedAt || 0);
      return 0;
    });
  },

  /** 渲染排序按钮 */
  renderSortBar() {
    const sorts = [
      { key: 'score', label: '🏆量化评分', defaultDir: 'desc' },
      { key: 'price', label: '💰价格', defaultDir: 'desc' },
      { key: 'change', label: '📊涨跌幅', defaultDir: 'desc' },
      { key: 'cost', label: '🎯成本', defaultDir: 'desc' },
      { key: 'name', label: '🔤名称', defaultDir: 'asc' },
      { key: 'added', label: '🕐时间', defaultDir: 'desc' }
    ];
    return '<div class="wl-sort-bar">' + sorts.map(s => {
      const activeKey = this.sortKey.replace(/_(asc|desc)$/, '');
      const dir = this.sortKey.endsWith('_asc') ? 'asc' : 'desc';
      const isActive = activeKey === s.key;
      let arrow = '';
      if (isActive) arrow = dir === 'desc' ? ' ↓' : ' ↑';
      const cls = isActive ? ' active' : '';
      const clickKey = s.key === 'name' ? 'name' : s.key + '_' + s.defaultDir;
      return '<button class="wl-sort-btn' + cls + '" onclick="Watchlist.setSort(\'' + clickKey + '\')">' + s.label + arrow + '</button>';
    }).join('') + '</div>';
  },

  /** 渲染自选股页面 */
  async render() {
    const container = document.getElementById('watchlistContent');
    const list = this.getList();

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-tip">暂无自选股，请在上方搜索添加</div>';
      return;
    }

    container.innerHTML = this.renderSortBar() + '<div class="loading-pulse"><span class="loading-spinner"></span>加载行情与评估数据...</div>';

    // 批量获取行情
    const quotes = await DataAPI.fetchQuotes(list);
    
    if (Object.keys(quotes).length === 0) {
      container.innerHTML = this.renderSortBar() + '<div class="empty-tip">行情加载失败，请下拉刷新</div>';
      return;
    }

    // 逐只获取K线并计算评估信息
    const items = [];
    const failedCodes = [];
    for (const code of list) {
      const q = quotes[code];
      if (!q) {
        // fallback：无法获取行情时仍显示该股票
        const fallbackName = CODE_TO_NAME[code] || code;
        console.warn('[Watchlist] 行情获取失败:', code);
        failedCodes.push(code);
        const noDataAdvice = { text: '暂无数据', icon: '⚠️', cls: 'advice-hold' };
        const noDims = { fundamental: 0, technical: 0, capital: 0, valuation: 0, sentiment: 0 };
        this._cache[code] = { score: 0, dims: noDims, advice: noDataAdvice, vwap: 0, quote: null };
        items.push({ code, name: fallbackName, price: 0, changePct: 0, score: 0, dims: noDims, advice: noDataAdvice, vwap: 0, noQuote: true, addedAt: this.getAddedAt(code) });
        continue;
      }
      let klines = [];
      try { klines = await DataAPI.fetchKline(code, 30); } catch(e) {
        console.warn('[Watchlist] K线获取失败:', code, e.message);
      }
      const scoreResult = this.quickScore(q, klines);
      const score = scoreResult.total;
      const dims = scoreResult.dims;
      const advice = this.getAdvice(score);
      const vwap = this.calcChipCost(klines);
      this._cache[code] = { score, dims, advice, vwap, quote: q };
      items.push({ code, name: q.name, price: q.price, changePct: q.changePct, score, dims, advice, vwap, addedAt: this.getAddedAt(code) });
    }
    if (failedCodes.length > 0) {
      console.log('[Watchlist] 行情获取失败的股票:', failedCodes.join(', '));
    }

    // 排序
    const sorted = this.applySort(items);

    let html = this.renderSortBar();
    if (failedCodes.length > 0) {
      html += '<div class="wl-debug-tip">⚠️ ' + failedCodes.length + '只股票行情获取失败</div>';
    }
    sorted.forEach(item => {
      const cls = Utils.colorClass(item.changePct);
      const scoreColor = Utils.scoreColor(item.score);
      const advice = item.advice;
      const vwapStr = item.vwap > 0 ? item.vwap.toFixed(2) : '--';
      // 价格与成本比较
      let costDiff = '';
      if (item.vwap > 0 && item.price > 0) {
        const diff = ((item.price - item.vwap) / item.vwap * 100).toFixed(1);
        const diffCls = diff >= 0 ? 'color-up' : 'color-down';
        costDiff = '<span class="wl-cost-diff ' + diffCls + '">' + (diff >= 0 ? '+' : '') + diff + '%</span>';
      }
      html += '<div class="watchlist-item watchlist-item-v2">';
      html += '<div class="wl-left" onclick="App.analyzeStock(\'' + item.code + '\')">';
      html += '<div class="wl-name">' + item.name + '</div>';
      html += '<div class="wl-code">' + item.code + '</div>';
      html += '</div>';
      html += '<div class="wl-middle">';
      // 筹码成本
      html += '<div class="wl-info-block">';
      html += '<span class="wl-info-label">筹码成本</span>';
      html += '<span class="wl-info-val">' + vwapStr + costDiff + '</span>';
      html += '</div>';
      html += '</div>';
      // 末尾：量化评分 + 操作分 + 价格
      const starLevel = Utils.scoreLevel(item.score);
      html += '<div class="wl-right">';
      html += '<div class="wl-price ' + cls + '" onclick="App.analyzeStock(\'' + item.code + '\')">' + (item.noQuote ? '--' : item.price.toFixed(2)) + '</div>';
      html += '<div class="wl-change ' + cls + '" onclick="App.analyzeStock(\'' + item.code + '\')">';
      html += (item.changePct > 0 ? '+' : '') + item.changePct.toFixed(2) + '%';
      html += '</div>';
      html += '<div class="wl-tail-scores">';
      html += '<div class="wl-quant-score" style="color:' + scoreColor + '"><span class="wl-qs-num">' + item.score + '</span><span class="wl-qs-stars">' + starLevel + '</span></div>';
      const opBg = item.score >= 70 ? 'rgba(0,200,83,0.2)' : item.score >= 40 ? 'rgba(255,165,0,0.2)' : 'rgba(255,71,87,0.2)';
      const opColor = item.score >= 70 ? '#00c853' : item.score >= 40 ? '#ffa500' : '#ff4757';
      html += '<div class="wl-op-score" style="background:' + opBg + ';color:' + opColor + '">' + advice.icon + item.advice.text + '</div>';
      html += '</div>';
      html += '<button class="wl-delete" onclick="Watchlist.removeAndRefresh(\'' + item.code + '\')">✕</button>';
      html += '</div>';
      html += '</div>';
    });
    container.innerHTML = html || this.renderSortBar() + '<div class="empty-tip">暂无数据</div>';
    App.setDirty(false);
  },

  /** 删除并刷新 */
  removeAndRefresh(code) {
    this.remove(code);
    this.render();
  }
};

// ============================================================
// 12. App - 主入口
// ============================================================
const App = {
  currentStock: null,
  klineChart: null,
  sevenDimChart: null,

  /** 初始化应用 */
  _isDirty: false, // 是否有未保存的编辑操作
  _previousPage: 'home', // 上一个页面

  init() {
    // 初始化导航
    Navigation.init();
    
    // 注册Service Worker
    this.registerSW();

    // 绑定搜索事件
    Search.bindInput('homeSearchInput', 'homeSearchResults', 'App.selectFromHomeSearch');
    Search.bindInput('analysisSearchInput', 'analysisSearchResults', 'App.selectFromAnalysisSearch');
    Search.bindInput('watchlistSearchInput', 'watchlistSearchResults', 'App.selectFromWatchlistSearch');

    // 更新时间
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // 加载首页数据
    this.loadHotStocks();

    // 定时刷新（60秒）
    setInterval(() => {
      if (Navigation.currentPage === 'home') {
        this.loadHotStocks();
      }
      if (Navigation.currentPage === 'watchlist') {
        Watchlist.render();
      }
    }, 60000);

    // 退出确认：防止误关闭
    window.addEventListener('beforeunload', (e) => {
      if (this._isDirty || Auth.isLoggedIn()) {
        e.preventDefault();
        e.returnValue = '确定退出智股分析？';
        return e.returnValue;
      }
    });
  },

  /** 标记页面有未保存修改 */
  setDirty(dirty) {
    this._isDirty = dirty;
  },

  /** 返回上一页 */
  goBack() {
    if (Navigation.currentPage === 'home') return; // 首页不处理
    
    // 如果在编辑状态，确认退出
    if (this._isDirty) {
      if (!confirm('您有未完成的编辑操作，确定要返回吗？')) return;
      this._isDirty = false;
    }
    
    // 返回上一页
    Navigation.switchTo(this._previousPage || 'home');
  },

  /** 注册Service Worker */
  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }
  },

  /** 更新时间显示 */
  updateTime() {
    const now = new Date();
    const str = now.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('headerTime').textContent = str;
  },

  /** 页面切换（统一入口，修复BUG） */
  switchPage(pageName) {
    Navigation.switchTo(pageName);
    // 页面切换时触发数据刷新
    if (pageName === 'watchlist') {
      Watchlist.render();
    }
    if (pageName === 'settings') {
      Auth.initSettingsPage();
    }
  },

  /** 加载热门股票Top20 */
  async loadHotStocks() {
    const container = document.getElementById('hotStocks');
    try {
      // 获取行情
      const quotes = await DataAPI.fetchQuotes(CONFIG.HOT_STOCKS);
      // 计算评分并排序
      const scored = [];
      for (const [code, q] of Object.entries(quotes)) {
        if (!q.price || q.price <= 0) continue;
        // 五维量化评分
        const scoreResult = Utils.fiveDimScore(q, null);
        scored.push({ code, name: q.name, price: q.price, change: q.changePct, score: scoreResult.total });
      }
      scored.sort((a, b) => b.score - a.score);
      const top20 = scored.slice(0, 20);

      container.innerHTML = top20.map((s, i) => {
        const cls = Utils.colorClass(s.change);
        const rankCls = i < 3 ? 'rank-top3' : 'rank-normal';
        return `
          <div class="hot-stock-item" onclick="App.analyzeStock('${s.code}')">
            <div class="rank ${rankCls}">${i + 1}</div>
            <div class="hs-info">
              <div class="hs-name">${s.name}</div>
              <div class="hs-code">${s.code}</div>
            </div>
            <div class="hs-price">
              <div class="hs-price-val ${cls}">${s.price.toFixed(2)}</div>
              <div class="hs-change-val ${cls}">${s.change > 0 ? '+' : ''}${s.change.toFixed(2)}%</div>
            </div>
            <div class="hs-score">
              <div class="hs-score-label-top">量化评分</div>
              <div class="hs-score-val" style="color:${Utils.scoreColor(s.score)}">${s.score}</div>
              <div class="hs-score-label">${Utils.scoreLevel(s.score)}</div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      container.innerHTML = '<div class="empty-tip">加载失败，请刷新重试</div>';
    }
  },

  /** 首页搜索 - 选择股票（回调函数） */
  selectFromHomeSearch(code) {
    this.currentStock = code;
    // 切换到分析页并自动开始分析
    this.switchPage('analysis');
    document.getElementById('analysisSearchInput').value = code;
    this.startAnalysis();
  },

  /** 分析页搜索 - 选择股票 */
  selectFromAnalysisSearch(code) {
    this.currentStock = code;
    document.getElementById('analysisSearchInput').value = code;
    this.startAnalysis();
  },

  /** 自选股搜索 - 选择股票 */
  selectFromWatchlistSearch(code) {
    Watchlist.add(code);
    document.getElementById('watchlistSearchInput').value = '';
    document.getElementById('watchlistSearchResults').innerHTML = '';
    Watchlist.render();
  },

  /** 首页搜索按钮 */
  handleHomeSearch() {
    const input = document.getElementById('homeSearchInput');
    const keyword = input.value.trim();
    if (!keyword) return;
    
    // 尝试解析代码
    const normalized = Utils.normalizeCode(keyword);
    if (normalized) {
      this.selectFromHomeSearch(normalized);
      return;
    }
    // 搜索名称
    const code = DataAPI.findCodeByName(keyword);
    if (code) {
      this.selectFromHomeSearch(code);
    } else {
      Search.doSearch(keyword, 'homeSearchResults', 'App.selectFromHomeSearch');
    }
  },

  /** 开始分析 */
  async startAnalysis() {
    const input = document.getElementById('analysisSearchInput');
    let keyword = input.value.trim();
    if (!keyword && this.currentStock) keyword = this.currentStock;
    if (!keyword) {
      Utils.toast('请输入股票代码或名称');
      return;
    }

    // 解析代码
    let code = Utils.normalizeCode(keyword);
    if (!code) code = DataAPI.findCodeByName(keyword);
    if (!code) {
      // 尝试从搜索结果获取
      const results = await DataAPI.searchStockFull(keyword);
      if (results.length > 0) {
        code = results[0].fullCode || results[0].code;
      }
    }
    if (!code) {
      Utils.toast('未找到该股票，请检查输入');
      return;
    }

    this.currentStock = code;
    await this.runAnalysis(code);
  },

  /** 从其他页面跳转分析 */
  async analyzeStock(code) {
    this.currentStock = code;
    this.switchPage('analysis');
    document.getElementById('analysisSearchInput').value = code;
    await this.runAnalysis(code);
  },

  /** 执行分析 */
  async runAnalysis(code) {
    // 显示加载状态
    this.showSection('stockSummary', true);
    document.getElementById('stockName').textContent = '加载中...';
    document.getElementById('stockCode').textContent = code;
    document.getElementById('stockPrice').textContent = '--';
    document.getElementById('stockChange').textContent = '';
    document.getElementById('stockMeta').innerHTML = '';

    // 隐藏之前的分析结果
    ['sevenDimCard', 'diagnosticResult', 'vwapCard', 'newsCard', 'conclusionCard'].forEach(id => {
      this.showSection(id, false);
    });
    for (let i = 1; i <= 8; i++) {
      document.getElementById(`diagMod${i}`).style.display = 'none';
    }
    document.getElementById('riskSummaryCard').style.display = 'none';

    try {
      // 并行获取数据
      const [quote, klines, capitalFlow, news] = await Promise.all([
        DataAPI.fetchQuote(code),
        DataAPI.fetchKline(code),
        DataAPI.fetchCapitalFlow(code),
        DataAPI.fetchNews(code)
      ]);

      if (!quote) {
        Utils.toast('获取行情数据失败');
        return;
      }

      // 渲染股票概要
      this.renderStockSummary(quote, code);

      // 七维度评分
      const scores = SevenDimAnalyzer.analyze(quote, klines, capitalFlow);

      // 持仓诊断
      const report = DiagnosticEngine.generateReport(quote, klines, capitalFlow, news, scores);

      // ===== 结论前置：先渲染操作建议摘要和主力成本 =====
      // 操作建议摘要
      this.renderConclusionSummary(quote, klines, capitalFlow, scores);

      // 主力成本（VWAP）
      if (klines.length > 0) {
        this.renderVWAP(klines, quote);
      }

      // 然后渲染七维度评分
      this.renderSevenDim(scores);

      // 持仓诊断详细模块
      this.renderDiagnostic(report);

      // 新闻公告
      if (news.length > 0) {
        this.renderNews(news);
      }

    } catch (e) {
      console.error('Analysis error:', e);
      Utils.toast('分析过程出错，请重试');
    }
  },

  /** 显示/隐藏区块 */
  showSection(id, show) {
    document.getElementById(id).style.display = show ? '' : 'none';
  },

  /** 渲染操作分摘要（操作建议+主力成本，结论前置） */
  renderConclusionSummary(quote, klines, capitalFlow, scores) {
    this.showSection('conclusionCard', true);
    const current = quote.price;
    const sr = Utils.calcSupportResistance(klines, current);
    const stopLoss = Math.min(sr.support, current * 0.92);
    const totalScore = scores.total;

    // 计算VWAP
    let vwap20 = 0;
    if (klines.length >= 20) {
      vwap20 = Utils.calcVWAP(klines.slice(-20).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume]));
    }

    // 操作建议类型判断
    let adviceType = '';
    let adviceIcon = '';
    let adviceDetail = '';

    if (totalScore >= 70) {
      adviceType = '持仓浮盈';
      adviceIcon = '✅';
      adviceDetail = '量化评分较高，基本面和技术面表现良好。建议持有并分批锁定利润，动态止损上移至成本价上方。';
    } else if (totalScore >= 40) {
      adviceType = '观望为主';
      adviceIcon = '📊';
      adviceDetail = '量化评分一般，存在一定风险因子。建议逢高减仓，降低风险敞口，等待更好的入场时机。';
    } else {
      adviceType = '空仓待入';
      adviceIcon = '⚠️';
      adviceDetail = '量化评分偏低，风险因子较多。如已持有建议果断止损离场；如未持有建议暂时观望，等待企稳信号。';
    }

    // 判断当前价与主力成本关系
    let costRelation = '';
    if (vwap20 > 0) {
      const diff = ((current - vwap20) / vwap20 * 100).toFixed(1);
      if (current > vwap20) {
        costRelation = `当前价高于20日主力成本${diff}%，主力整体获利。`;
      } else {
        costRelation = `当前价低于20日主力成本${Math.abs(diff)}%，主力可能存在浮亏。`;
      }
    }

    const el = document.getElementById('conclusionContent');
    el.innerHTML = `
      <div class="conclusion-summary">
        <div class="cs-advice">
          <div class="cs-advice-header">
            <span class="cs-advice-icon">${adviceIcon}</span>
            <span class="cs-advice-type">${adviceType}</span>
            <span class="cs-score-badge" style="color:${Utils.scoreColor(totalScore)}">${totalScore}分 ${Utils.scoreLevel(totalScore)}</span>
          </div>
          <p class="cs-advice-detail">${adviceDetail}</p>
        </div>
        <div class="cs-cost">
          <div class="cs-cost-header">
            <span class="cs-cost-icon">🏦</span>
            <span class="cs-cost-title">主力成本区间</span>
          </div>
          <div class="cs-cost-grid">
            <div class="cs-cost-item">
              <span class="cs-cost-label">5日成本</span>
              <span class="cs-cost-val">${klines.length >= 5 ? Utils.calcVWAP(klines.slice(-5).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume])).toFixed(2) : '--'}</span>
            </div>
            <div class="cs-cost-item">
              <span class="cs-cost-label">20日成本</span>
              <span class="cs-cost-val">${vwap20 > 0 ? vwap20.toFixed(2) : '--'}</span>
            </div>
            <div class="cs-cost-item">
              <span class="cs-cost-label">60日成本</span>
              <span class="cs-cost-val">${klines.length >= 60 ? Utils.calcVWAP(klines.slice(-60).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume])).toFixed(2) : '--'}</span>
            </div>
            <div class="cs-cost-item">
              <span class="cs-cost-label">止损价</span>
              <span class="cs-cost-val" style="color:var(--accent-red)">${stopLoss.toFixed(2)}</span>
            </div>
          </div>
          <p class="cs-cost-relation">${costRelation}</p>
        </div>
        <div class="cs-key-prices">
          <div class="cs-kp-item"><span class="cs-kp-label">支撑位</span><span class="cs-kp-val color-up">${sr.support}</span></div>
          <div class="cs-kp-item"><span class="cs-kp-label">压力位</span><span class="cs-kp-val color-down">${sr.resistance}</span></div>
        </div>
      </div>
    `;
  },

  /** 渲染股票概要 */
  renderStockSummary(quote, code) {
    document.getElementById('stockName').textContent = quote.name;
    document.getElementById('stockCode').textContent = code;
    
    const priceEl = document.getElementById('stockPrice');
    priceEl.textContent = quote.price.toFixed(2);
    priceEl.className = 'stock-price ' + Utils.colorClass(quote.changePct);

    const changeEl = document.getElementById('stockChange');
    const sign = quote.changePct >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${quote.change.toFixed(2)}  ${sign}${quote.changePct.toFixed(2)}%`;
    changeEl.className = 'stock-change ' + Utils.colorClass(quote.changePct);

    // 元数据
    document.getElementById('stockMeta').innerHTML = `
      <div class="meta-item"><span class="meta-label">开盘</span><span class="meta-val">${quote.open.toFixed(2)}</span></div>
      <div class="meta-item"><span class="meta-label">最高</span><span class="meta-val color-up">${quote.high.toFixed(2)}</span></div>
      <div class="meta-item"><span class="meta-label">最低</span><span class="meta-val color-down">${quote.low.toFixed(2)}</span></div>
      <div class="meta-item"><span class="meta-label">昨收</span><span class="meta-val">${quote.prevClose.toFixed(2)}</span></div>
      <div class="meta-item"><span class="meta-label">成交量</span><span class="meta-val">${(quote.volume / 10000).toFixed(0)}万手</span></div>
      <div class="meta-item"><span class="meta-label">成交额</span><span class="meta-val">${(quote.amount / 10000).toFixed(1)}亿</span></div>
      <div class="meta-item"><span class="meta-label">换手率</span><span class="meta-val">${quote.turnover.toFixed(2)}%</span></div>
      <div class="meta-item"><span class="meta-label">PE</span><span class="meta-val">${quote.pe > 0 ? quote.pe.toFixed(1) : '--'}</span></div>
      <div class="meta-item"><span class="meta-label">PB</span><span class="meta-val">${quote.pb > 0 ? quote.pb.toFixed(2) : '--'}</span></div>
      <div class="meta-item"><span class="meta-label">总市值</span><span class="meta-val">${quote.marketCap.toFixed(0)}亿</span></div>
      <div class="meta-item"><span class="meta-label">流通市值</span><span class="meta-val">${quote.circCap.toFixed(0)}亿</span></div>
      <div class="meta-item"><span class="meta-label">振幅</span><span class="meta-val">${quote.amplitude.toFixed(2)}%</span></div>
    `;
  },

  /** 渲染七维度评分 */
  renderSevenDim(scores) {
    this.showSection('sevenDimCard', true);
    const dimNames = {
      fundamental: '基本面', technical: '技术面', capital: '资金面',
      valuation: '估值面', sentiment: '情绪面'
    };
    const dimIcons = {
      fundamental: '📊', technical: '📈', capital: '💰',
      valuation: '💎', sentiment: '🎭'
    };
    const dimWeights = { fundamental: '30%', technical: '25%', capital: '20%', valuation: '15%', sentiment: '10%' };
    const dimDesc = {
      fundamental: '盈利·成长·规模',
      technical: '均线·位置·动量',
      capital: '换手·量能·流向',
      valuation: 'PE·PB·市值',
      sentiment: '波动·量价·强弱'
    };

    // 量化评分大数字
    const totalScore = scores.total;
    const starLevel = Utils.scoreLevel(totalScore);
    const levelText = Utils.scoreLevelText(totalScore);
    const sColor = Utils.scoreColor(totalScore);
    document.getElementById('totalScore').innerHTML =
      '<div class="total-score-display">' +
      '<div class="total-score-big" style="color:' + sColor + '">' + totalScore + '</div>' +
      '<div class="total-score-stars">' + starLevel + '</div>' +
      '<div class="total-score-level" style="color:' + sColor + '">' + levelText + '</div>' +
      '</div>';

    // 五维评分条
    let gridHtml = '';
    Object.entries(dimNames).forEach(([key, name]) => {
      const val = scores.dims ? scores.dims[key] : scores[key];
      const barColor = Utils.scoreColor(val);
      gridHtml += '<div class="dim-score-item-v2">';
      gridHtml += '<div class="dim-header">';
      gridHtml += '<span class="dim-icon">' + dimIcons[key] + '</span>';
      gridHtml += '<span class="dim-name">' + name + '</span>';
      gridHtml += '<span class="dim-weight">' + dimWeights[key] + '</span>';
      gridHtml += '<span class="dim-val" style="color:' + barColor + '">' + val + '分</span>';
      gridHtml += '</div>';
      gridHtml += '<div class="dim-bar-wrap"><div class="dim-bar" style="width:' + val + '%;background:' + barColor + '"></div></div>';
      gridHtml += '<div class="dim-desc">' + dimDesc[key] + '</div>';
      gridHtml += '</div>';
    });
    document.getElementById('sevenDimScores').innerHTML = gridHtml;

    // ECharts五维雷达图
    if (this.sevenDimChart) this.sevenDimChart.dispose();
    const chartDom = document.getElementById('sevenDimChart');
    this.sevenDimChart = echarts.init(chartDom, 'dark');
    const dimValues = Object.keys(dimNames).map(k => scores.dims ? scores.dims[k] : scores[k]);
    this.sevenDimChart.setOption({
      backgroundColor: 'transparent',
      radar: {
        indicator: Object.values(dimNames).map(name => ({ name, max: 100 })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#8a8e9b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(42,46,62,0.8)' } },
        splitArea: { areaStyle: { color: ['rgba(26,31,46,0.3)', 'rgba(26,31,46,0.5)'] } },
        axisLine: { lineStyle: { color: 'rgba(42,46,62,0.8)' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: dimValues,
          name: '五维评分',
          areaStyle: { color: 'rgba(0,212,255,0.15)' },
          lineStyle: { color: '#00d4ff', width: 2 },
          itemStyle: { color: '#00d4ff' }
        }]
      }]
    });
  },

  /** 渲染K线图 */
  renderKline(klines, quote) {
    this.showSection('klineCard', true);
    if (this.klineChart) this.klineChart.dispose();
    const chartDom = document.getElementById('klineChart');
    this.klineChart = echarts.init(chartDom, 'dark');

    const dates = klines.map(k => k.date);
    const ohlc = klines.map(k => [k.open, k.close, k.low, k.high]);
    const volumes = klines.map(k => k.volume);
    const closes = klines.map(k => k.close);

    // 计算均线
    const ma5 = [], ma10 = [], ma20 = [];
    for (let i = 0; i < closes.length; i++) {
      ma5.push(Utils.calcMA(closes.slice(0, i + 1), 5));
      ma10.push(Utils.calcMA(closes.slice(0, i + 1), 10));
      ma20.push(Utils.calcMA(closes.slice(0, i + 1), 20));
    }

    this.klineChart.setOption({
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(19,23,34,0.95)',
        borderColor: '#2a2e3e',
        textStyle: { color: '#e1e3ea', fontSize: 12 }
      },
      grid: [
        { left: '10%', right: '3%', top: '5%', height: '55%' },
        { left: '10%', right: '3%', top: '68%', height: '22%' }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#2a2e3e' } } },
        { type: 'category', data: dates, gridIndex: 1, axisLabel: { fontSize: 10, color: '#5a5e6b' }, axisLine: { lineStyle: { color: '#2a2e3e' } } }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: 'rgba(42,46,62,0.5)' } }, axisLabel: { fontSize: 10, color: '#5a5e6b' } },
        { scale: true, gridIndex: 1, splitLine: { show: false }, axisLabel: { show: false } }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1], bottom: '2%', height: 16, borderColor: '#2a2e3e', backgroundColor: '#131722' }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: ohlc,
          xAxisIndex: 0, yAxisIndex: 0,
          itemStyle: {
            color: '#ff4757', color0: '#00e676',
            borderColor: '#ff4757', borderColor0: '#00e676'
          }
        },
        { name: 'MA5', type: 'line', data: ma5, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#ffd54f' } },
        { name: 'MA10', type: 'line', data: ma10, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#00d4ff' } },
        { name: 'MA20', type: 'line', data: ma20, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#b388ff' } },
        {
          name: '成交量',
          type: 'bar',
          data: volumes.map((v, i) => ({
            value: v,
            itemStyle: { color: klines[i].close >= klines[i].open ? 'rgba(255,71,87,0.5)' : 'rgba(0,230,118,0.5)' }
          })),
          xAxisIndex: 1, yAxisIndex: 1
        }
      ]
    });
  },

  /** 渲染诊断报告 */
  renderDiagnostic(report) {
    this.showSection('diagnosticResult', true);
    // 模块1-4和6-8是HTML字符串
    const htmlModules = { 1: report.mod1, 2: report.mod2, 3: report.mod3, 4: report.mod4, 6: report.mod6, 7: report.mod7, 8: report.mod8 };
    Object.entries(htmlModules).forEach(([num, html]) => {
      document.getElementById(`diagMod${num}`).style.display = '';
      document.getElementById(`mod${num}Content`).innerHTML = html;
    });
    // 模块5特殊处理（返回{html, risks}）
    document.getElementById('diagMod5').style.display = '';
    document.getElementById('mod5Content').innerHTML = report.mod5.html;
    // 风险汇总
    this.showSection('riskSummaryCard', true);
    document.getElementById('riskSummaryContent').innerHTML = report.riskSummary;
  },

  /** 渲染VWAP主力成本 */
  renderVWAP(klines, quote) {
    this.showSection('vwapCard', true);
    const vwap5 = Utils.calcVWAP(klines.slice(-5).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume]));
    const vwap10 = Utils.calcVWAP(klines.slice(-10).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume]));
    const vwap20 = Utils.calcVWAP(klines.slice(-20).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume]));
    const vwap60 = klines.length >= 60 ? Utils.calcVWAP(klines.slice(-60).map(k => [k.date, k.open, k.high, k.low, k.close, k.volume])) : 0;

    const current = quote.price;
    const vs5 = current > vwap5 ? '高于' : '低于';
    const vs20 = current > vwap20 ? '高于' : '低于';

    document.getElementById('vwapContent').innerHTML = `
      <div class="vwap-grid">
        <div class="vwap-item"><span class="vw-label">5日VWAP</span><span class="vw-val">${vwap5.toFixed(2)}</span></div>
        <div class="vwap-item"><span class="vw-label">10日VWAP</span><span class="vw-val">${vwap10.toFixed(2)}</span></div>
        <div class="vwap-item"><span class="vw-label">20日VWAP</span><span class="vw-val">${vwap20.toFixed(2)}</span></div>
        <div class="vwap-item"><span class="vw-label">60日VWAP</span><span class="vw-val">${vwap60 > 0 ? vwap60.toFixed(2) : '--'}</span></div>
      </div>
      <p style="margin-top:12px;font-size:13px;color:var(--text-secondary)">
        💡 当前价${vs5}5日VWAP，${vs20}20日VWAP。
        ${current > vwap20 ? '价格在中期成本线上方，主力整体获利。' : '价格在中期成本线下方，主力可能存在浮亏。'}
      </p>
    `;
  },

  /** 渲染新闻公告 */
  renderNews(news) {
    this.showSection('newsCard', true);
    document.getElementById('newsContent').innerHTML = news.slice(0, 10).map(n => `
      <div class="news-item">
        <div class="news-title">${n.title}</div>
        <div class="news-time">${n.time} ${n.type || ''}</div>
      </div>
    `).join('') || '<div class="empty-tip">暂无公告</div>';
  },

  /** 添加自选股 */
  addToWatchlist() {
    const input = document.getElementById('watchlistSearchInput');
    const keyword = input.value.trim();
    if (!keyword) {
      Utils.toast('请输入股票代码或名称');
      return;
    }
    const code = Utils.normalizeCode(keyword);
    if (code) {
      Watchlist.add(code);
      input.value = '';
      document.getElementById('watchlistSearchResults').innerHTML = '';
      Watchlist.render();
      return;
    }
    const found = DataAPI.findCodeByName(keyword);
    if (found) {
      Watchlist.add(found);
      input.value = '';
      document.getElementById('watchlistSearchResults').innerHTML = '';
      Watchlist.render();
    } else {
      Search.doSearch(keyword, 'watchlistSearchResults', 'App.selectFromWatchlistSearch');
    }
  },

  /** 运行智能选股 */
  runScreener() {
    const strategy = document.getElementById('screenerStrategy').value;
    Screener.run(strategy);
  }
};

// ============================================================
// 13. Auth - 登录授权模块
// ============================================================
const Auth = {
  STORAGE_KEY: 'zhigu_auth',
  SESSION_KEY: 'zhigu_session',
  DEFAULT_PHONE: '13800138000',
  DEFAULT_PWD: 'zhigu2026',
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000, // 7天

  /** 简单hash（用于密码存储，非安全加密） */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // 再做一轮混淆
    return 'h1_' + Math.abs(hash).toString(36) + '_' + str.length;
  },

  /** 获取授权数据 */
  _getAuth() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch(e) {}
    // 返回默认授权
    return {
      users: [{ phone: this.DEFAULT_PHONE, password: this._hash(this.DEFAULT_PWD) }]
    };
  },

  /** 保存授权数据 */
  _saveAuth(auth) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
  },

  /** 获取session */
  _getSession() {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (data) {
        const session = JSON.parse(data);
        if (session.expires > Date.now()) return session;
      }
    } catch(e) {}
    return null;
  },

  /** 保存session */
  _saveSession(phone, remember) {
    const session = {
      phone,
      expires: remember ? Date.now() + this.SESSION_DURATION : Date.now() + 24 * 60 * 60 * 1000
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  /** 验证密码 */
  _verifyPassword(phone, password) {
    const auth = this._getAuth();
    const hashedPwd = this._hash(password);
    const user = auth.users.find(u => u.phone === phone);
    if (user && user.password === hashedPwd) return true;
    // fallback: 如果是默认密码且用户未修改过
    if (!user && phone === this.DEFAULT_PHONE && hashedPwd === this._hash(this.DEFAULT_PWD)) return true;
    return false;
  },

  /** 检查是否已登录 */
  isLoggedIn() {
    return !!this._getSession();
  },

  /** 获取当前登录手机号 */
  getCurrentUser() {
    const session = this._getSession();
    return session ? session.phone : null;
  },

  /** 初始化：检查登录状态 */
  init() {
    const loginPage = document.getElementById('page-login');
    const appHeader = document.getElementById('app-header');
    const appContent = document.getElementById('app-content');
    const appNav = document.getElementById('app-nav');

    if (this.isLoggedIn()) {
      // 已登录，隐藏登录页
      loginPage.style.display = 'none';
      appHeader.style.display = '';
      appContent.style.display = '';
      appNav.style.display = '';
    } else {
      // 未登录，显示登录页
      loginPage.style.display = 'flex';
      appHeader.style.display = 'none';
      appContent.style.display = 'none';
      appNav.style.display = 'none';
    }
  },

  /** 处理登录 */
  handleLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('loginRemember').checked;
    const errorEl = document.getElementById('loginError');

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      errorEl.textContent = '请输入正确的11位手机号';
      errorEl.style.display = 'block';
      return false;
    }

    // 验证密码
    if (this._verifyPassword(phone, password)) {
      this._saveSession(phone, remember);
      errorEl.style.display = 'none';
      // 显示主界面
      document.getElementById('page-login').style.display = 'none';
      document.getElementById('app-header').style.display = '';
      document.getElementById('app-content').style.display = '';
      document.getElementById('app-nav').style.display = '';
      // 初始化APP
      App.init();
    } else {
      errorEl.textContent = '手机号或密码错误';
      errorEl.style.display = 'block';
    }
    return false;
  },

  /** 修改密码 */
  handleChangePassword(event) {
    event.preventDefault();
    const oldPwd = document.getElementById('oldPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;

    if (newPwd.length < 6) {
      alert('新密码至少6位');
      return false;
    }

    if (newPwd !== confirmPwd) {
      alert('两次输入的新密码不一致');
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!this._verifyPassword(currentUser, oldPwd)) {
      alert('当前密码错误');
      return false;
    }

    const auth = this._getAuth();
    const user = auth.users.find(u => u.phone === currentUser);
    if (user) {
      user.password = this._hash(newPwd);
      this._saveAuth(auth);
      alert('密码修改成功');
      document.getElementById('changePwdForm').reset();
    } else {
      alert('用户不存在');
    }
    return false;
  },

  /** 添加手机号 */
  handleAddPhone(event) {
    event.preventDefault();
    const newPhone = document.getElementById('newPhone').value.trim();
    const pwd = document.getElementById('addPhonePwd').value;

    if (!/^1[3-9]\d{9}$/.test(newPhone)) {
      alert('请输入正确的11位手机号');
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!this._verifyPassword(currentUser, pwd)) {
      alert('密码错误，无法添加');
      return false;
    }

    const auth = this._getAuth();
    if (auth.users.find(u => u.phone === newPhone)) {
      alert('该手机号已存在');
      return false;
    }

    auth.users.push({ phone: newPhone, password: this._hash(this.DEFAULT_PWD) });
    this._saveAuth(auth);
    alert('添加成功，初始密码为：' + this.DEFAULT_PWD);
    document.getElementById('addPhoneForm').reset();
    this.renderPhoneList();
    return false;
  },

  /** 删除手机号 */
  removePhone(phone) {
    const currentUser = this.getCurrentUser();
    if (phone === currentUser) {
      alert('不能删除当前登录的手机号');
      return;
    }
    if (!confirm('确定删除手机号 ' + phone + ' ？')) return;
    const auth = this._getAuth();
    auth.users = auth.users.filter(u => u.phone !== phone);
    this._saveAuth(auth);
    this.renderPhoneList();
  },

  /** 渲染手机号列表 */
  renderPhoneList() {
    const auth = this._getAuth();
    const currentUser = this.getCurrentUser();
    const container = document.getElementById('phoneList');
    if (!container) return;
    
    container.innerHTML = auth.users.map(u => `
      <div class="phone-item">
        <span>📱 ${u.phone}${u.phone === currentUser ? '<span class="phone-tag">(当前)</span>' : ''}</span>
        ${u.phone !== currentUser ? '<button class="del-btn" onclick="Auth.removePhone(\'' + u.phone + '\')">删除</button>' : ''}
      </div>
    `).join('');
  },

  /** 退出登录 */
  logout() {
    if (!confirm('确定退出登录？')) return;
    localStorage.removeItem(this.SESSION_KEY);
    location.reload();
  },

  /** 设置页面初始化 */
  initSettingsPage() {
    const currentUser = this.getCurrentUser();
    const phoneEl = document.getElementById('settingsCurrentUser');
    if (phoneEl) phoneEl.textContent = currentUser || '--';
    this.renderPhoneList();
  }
};

// ============================================================
// 应用启动（带登录检查）
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 先初始化登录检查
  Auth.init();
  
  // 如果已登录，初始化APP
  if (Auth.isLoggedIn()) {
    App.init();
  }
});
