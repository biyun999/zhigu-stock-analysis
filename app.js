/**
 * 智股分析 v3.6 - A股智能分析系统（次日上涨概率TOP20+隔日核实+自选股批量导入）
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
  // 腾讯智能搜索API（备用，JSONP方式返回v_hint变量）
  TENCENT_SEARCH: 'https://smartbox.gtimg.cn/s3/',
  // 东方财富资金流向API（多通道容灾，按优先级排列）
  EM_CAPITAL_CHANNELS: [
    'https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get',
    'https://82.push2.eastmoney.com/api/qt/stock/fflow/daykline/get',
    'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get'
  ],
  EM_CAPITAL: 'https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get',
  // 东方财富财务数据API
  EM_FINANCE: 'https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get',
  // 东方财富实时行情API（北交所备用）
  EM_QUOTE: 'https://push2.eastmoney.com/api/qt/stock/get',
  // 东方财富clist系列API多通道（板块/排行/成分股，主域+延时备份域）
  EM_CLIST_CHANNELS: [
    'https://push2.eastmoney.com/api/qt/clist/get',
    'https://push2delay.eastmoney.com/api/qt/clist/get'
  ],
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
      // 北交所/新三板：8开头、4开头（43/83等）、920开头（北交所新代码段）
      if (code.startsWith('8') || code.startsWith('920') || code.startsWith('43') || code.startsWith('40') || code.startsWith('41') || code.startsWith('42')) return 'bj' + code;
      // 沪市ETF/REITs（51/508/56开头，588为科创板ETF、580为科创板权证类）
      if (code.startsWith('51') || code.startsWith('508') || code.startsWith('56') || code.startsWith('588') || code.startsWith('580')) return 'sh' + code;
      // 深市ETF/可转债
      if (code.startsWith('15') || code.startsWith('12') || code.startsWith('16')) return 'sz' + code;
      // 沪市主板/科创板/可转债（6开头=主板，688/689=科创板，9开头=沪市B股）
      if (code.startsWith('6') || code.startsWith('688')) return 'sh' + code;
      // 沪市可转债 11开头
      if (code.startsWith('11')) return 'sh' + code;
      // 其余0/3开头为深市
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

  /** 计算KDJ指标（9,3,3） */
  calcKDJ(closes, n = 9) {
    if (closes.length < n + 2) return { k: 50, d: 50, j: 50 };
    let rsvArr = [];
    for (let i = n - 1; i < closes.length; i++) {
      const slice = closes.slice(i - n + 1, i + 1);
      const low = Math.min(...slice);
      const high = Math.max(...slice);
      const rsv = high === low ? 50 : (closes[i] - low) / (high - low) * 100;
      rsvArr.push(rsv);
    }
    let k = 50, d = 50;
    for (const rsv of rsvArr) {
      k = 2 / 3 * k + 1 / 3 * rsv;
      d = 2 / 3 * d + 1 / 3 * k;
    }
    const j = 3 * k - 2 * d;
    return { k, d, j };
  },

  /** 计算EMA序列（返回与输入等长的数组，前period-1项为null） */
  calcEMASeries(data, period) {
    const result = new Array(data.length).fill(null);
    if (data.length < period) return result;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result[period - 1] = ema;
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result[i] = ema;
    }
    return result;
  },

  /** 计算MA序列（返回与输入等长的数组，前period-1项为null） */
  calcMASeries(data, period) {
    const result = new Array(data.length).fill(null);
    if (data.length < period) return result;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    result[period - 1] = sum / period;
    for (let i = period; i < data.length; i++) {
      sum = sum - data[i - period] + data[i];
      result[i] = sum / period;
    }
    return result;
  },

  /** 计算MACD序列（12,26,9），返回等长dif/dea/macd数组，前段为null */
  calcMACDSeries(closes) {
    const n = closes.length;
    const empty = () => new Array(n).fill(null);
    if (n < 26) return { dif: empty(), dea: empty(), macd: empty() };
    const ema12 = this.calcEMASeries(closes, 12);
    const ema26 = this.calcEMASeries(closes, 26);
    const dif = empty();
    for (let i = 25; i < n; i++) {
      if (ema12[i] !== null && ema26[i] !== null) dif[i] = ema12[i] - ema26[i];
    }
    // DEA是DIF的9日EMA，以首个有效DIF为种子
    const dea = empty();
    let ema = null;
    const k = 2 / (9 + 1);
    for (let i = 0; i < n; i++) {
      if (dif[i] == null) continue;
      if (ema === null) ema = dif[i];
      else ema = dif[i] * k + ema * (1 - k);
      dea[i] = ema;
    }
    const macd = empty();
    for (let i = 0; i < n; i++) {
      if (dif[i] !== null && dea[i] !== null) macd[i] = (dif[i] - dea[i]) * 2;
    }
    return { dif, dea, macd };
  },

  /** 计算KDJ序列（9,3,3），返回等长K/D/J数组，前段为null */
  calcKDJSeries(closes, highs, lows, n = 9) {
    const len = closes.length;
    const empty = () => new Array(len).fill(null);
    if (len < n) return { k: empty(), d: empty(), j: empty() };
    const kArr = empty(), dArr = empty(), jArr = empty();
    let k = 50, d = 50, started = false;
    for (let i = n - 1; i < len; i++) {
      let low = Infinity, high = -Infinity;
      for (let j = i - n + 1; j <= i; j++) {
        if (lows[j] < low) low = lows[j];
        if (highs[j] > high) high = highs[j];
      }
      const rsv = high === low ? 50 : (closes[i] - low) / (high - low) * 100;
      k = 2 / 3 * k + 1 / 3 * rsv;
      d = 2 / 3 * d + 1 / 3 * k;
      kArr[i] = k; dArr[i] = d; jArr[i] = 3 * k - 2 * d;
      started = true;
    }
    return { k: kArr, d: dArr, j: jArr };
  },

  /** 计算RSI序列，返回等长数组，前段为null */
  calcRSISeries(closes, period = 14) {
    const len = closes.length;
    const result = new Array(len).fill(null);
    if (len < period + 1) return result;
    let gainSum = 0, lossSum = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gainSum += diff; else lossSum -= diff;
    }
    let avgGain = gainSum / period, avgLoss = lossSum / period;
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < len; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
  },

  /** 计算布林带BOLL序列（20,2），返回等长mid/upper/lower数组，前段为null */
  calcBOLLSeries(closes, period = 20, multiplier = 2) {
    const len = closes.length;
    const empty = () => new Array(len).fill(null);
    if (len < period) return { mid: empty(), upper: empty(), lower: empty() };
    const mid = this.calcMASeries(closes, period);
    const upper = empty(), lower = empty();
    for (let i = period - 1; i < len; i++) {
      const m = mid[i];
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += (closes[j] - m) ** 2;
      }
      const std = Math.sqrt(variance / period);
      upper[i] = m + multiplier * std;
      lower[i] = m - multiplier * std;
    }
    return { mid, upper, lower };
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
    // 兼容数组格式和对象格式
    const getLow = k => Array.isArray(k) ? k[3] : (k.low || 0);
    const getHigh = k => Array.isArray(k) ? k[2] : (k.high || 0);
    const getClose = k => Array.isArray(k) ? k[4] : (k.close || 0);
    
    const lows = recent.map(getLow).filter(v => v > 0);
    const highs = recent.map(getHigh).filter(v => v > 0);
    
    if (lows.length === 0 || highs.length === 0) return { support: 0, resistance: 0 };
    
    // 支撑位：近期最低价
    const support = Math.min(...lows) * 1.005;
    // 压力位：近期最高价
    const resistance = Math.max(...highs) * 0.995;
    
    return { support: +support.toFixed(2), resistance: +resistance.toFixed(2) };
  },

  /**
   * 筹码结构分析（基于N日K线成交量价分布估算）
   * @param {Array} klines K线数组（对象格式 {date,open,high,low,close,volume}）
   * @param {number} currentPrice 当前价
   * @returns {Object} {profitRatio, avgCost, concentration, supportChip, resistanceChip, pressureDistance}
   */
  calcChipDistribution(klines, currentPrice) {
    if (!klines || klines.length < 10 || !currentPrice || currentPrice <= 0) {
      return { profitRatio: 50, avgCost: 0, concentration: 0, supportChip: 0, resistanceChip: 0, pressureDistance: 0, belowRatio: 50 };
    }
    // 使用近60日K线（若不足则全部）
    const period = klines.slice(-60);
    // 价格区间
    let pMin = Infinity, pMax = -Infinity;
    period.forEach(k => {
      if (k.low < pMin) pMin = k.low;
      if (k.high > pMax) pMax = k.high;
    });
    if (pMin >= pMax) return { profitRatio: 50, avgCost: 0, concentration: 0, supportChip: 0, resistanceChip: 0, pressureDistance: 0, belowRatio: 50 };

    // 分50个价格桶
    const BUCKETS = 50;
    const step = (pMax - pMin) / BUCKETS;
    const bins = new Array(BUCKETS).fill(0);
    let totalVol = 0;
    let weightedPrice = 0;
    period.forEach(k => {
      // 当日典型价格
      const typ = (k.open + k.high + k.low + k.close) / 4;
      let idx = Math.floor((typ - pMin) / step);
      if (idx < 0) idx = 0;
      if (idx >= BUCKETS) idx = BUCKETS - 1;
      // 成交量分布到 [low, high] 区间的桶
      const loIdx = Math.max(0, Math.floor((k.low - pMin) / step));
      const hiIdx = Math.min(BUCKETS - 1, Math.floor((k.high - pMin) / step));
      const span = Math.max(1, hiIdx - loIdx + 1);
      for (let bi = loIdx; bi <= hiIdx; bi++) {
        bins[bi] += k.volume / span;
      }
      totalVol += k.volume;
      weightedPrice += typ * k.volume;
    });
    if (totalVol === 0) return { profitRatio: 50, avgCost: 0, concentration: 0, supportChip: 0, resistanceChip: 0, pressureDistance: 0, belowRatio: 50 };

    const avgCost = weightedPrice / totalVol;

    // 获利盘比例：价格低于当前价的桶的成交量占比
    let belowVol = 0;
    for (let i = 0; i < BUCKETS; i++) {
      const bucketPrice = pMin + (i + 0.5) * step;
      if (bucketPrice < currentPrice) belowVol += bins[i];
    }
    const profitRatio = Math.round(belowVol / totalVol * 100);

    // 找到最大成交量峰（筹码主峰）
    let maxBin = 0, maxIdx = 0;
    bins.forEach((v, i) => { if (v > maxBin) { maxBin = v; maxIdx = i; } });
    const peakPrice = pMin + (maxIdx + 0.5) * step;

    // 筹码支撑位：当前价下方最近的高量峰
    let supportChip = 0, supportVol = 0;
    const curBin = Math.floor((currentPrice - pMin) / step);
    for (let i = Math.min(curBin, BUCKETS - 1); i >= 0; i--) {
      if (bins[i] > supportVol) {
        supportVol = bins[i];
        supportChip = pMin + (i + 0.5) * step;
      }
    }
    // 筹码压力位：当前价上方最近的高量峰
    let resistanceChip = 0, resistanceVol = 0;
    for (let i = Math.max(curBin, 0); i < BUCKETS; i++) {
      if (bins[i] > resistanceVol) {
        resistanceVol = bins[i];
        resistanceChip = pMin + (i + 0.5) * step;
      }
    }

    // 90%筹码集中度：找到包含90%成交量的最窄价格区间
    const sortedBins = bins.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    let cumVol = 0, minI = BUCKETS, maxI = 0;
    for (const item of sortedBins) {
      cumVol += item.v;
      if (item.i < minI) minI = item.i;
      if (item.i > maxI) maxI = item.i;
      if (cumVol >= totalVol * 0.9) break;
    }
    const concLow = pMin + minI * step;
    const concHigh = pMin + (maxI + 1) * step;
    const concentration = +((concHigh - concLow) / currentPrice * 100).toFixed(1);

    // 距压力位涨幅空间
    const pressureDistance = resistanceChip > currentPrice
      ? +((resistanceChip - currentPrice) / currentPrice * 100).toFixed(1)
      : 0;

    return {
      profitRatio,
      avgCost: +avgCost.toFixed(2),
      concentration,
      supportChip: +supportChip.toFixed(2),
      resistanceChip: +resistanceChip.toFixed(2),
      pressureDistance,
      belowRatio: profitRatio,
      peakPrice: +peakPrice.toFixed(2)
    };
  },

  /** 评分转等级文字 */
  scoreLevel(score) {
    if (score >= 80) return '★★★★★';
    if (score >= 65) return '★★★★☆';
    if (score >= 50) return '★★★☆☆';
    if (score >= 35) return '★★☆☆☆';
    return '★☆☆☆☆';
  },

  scoreLevelText(score) {
    if (score >= 80) return '极优秀';
    if (score >= 65) return '良好';
    if (score >= 50) return '一般';
    if (score >= 35) return '较弱';
    return '危险';
  },

  scoreColor(score) {
    if (score >= 80) return '#00e676';
    if (score >= 65) return '#00d4ff';
    if (score >= 50) return '#ffa726';
    if (score >= 35) return '#ff8c00';
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
    // 基本面评分：评估公司估值质量和经营稳定性
    let s = 50;

    // === PE估值质量（权重：核心指标）===
    const pe = quote.pe || 0;
    if (pe > 0 && pe < 10) s += 22;        // 低估值，安全边际高
    else if (pe >= 10 && pe < 18) s += 16;  // 合理偏低
    else if (pe >= 18 && pe < 28) s += 8;   // 合理区间
    else if (pe >= 28 && pe < 45) s += 0;   // 合理偏高
    else if (pe >= 45 && pe < 80) s -= 8;   // 偏高，泡沫风险
    else if (pe >= 80) s -= 18;             // 严重高估
    else s -= 15;                           // 亏损企业

    // === PB估值质量 ===
    const pb = quote.pb || 0;
    if (pb > 0 && pb < 1) s += 18;          // 破净，深度价值
    else if (pb >= 1 && pb < 2) s += 14;    // 低PB，安全边际好
    else if (pb >= 2 && pb < 3.5) s += 6;   // 合理
    else if (pb >= 3.5 && pb < 6) s -= 3;   // 偏高
    else if (pb >= 6) s -= 12;              // 严重高估
    else s -= 10;                           // 负净资产

    // === 市值稳定性（大市值更稳健）===
    const mc = quote.marketCap || 0;
    if (mc > 1000) s += 12;                 // 超大盘蓝筹
    else if (mc > 500) s += 9;              // 大盘股
    else if (mc > 200) s += 5;              // 中盘股
    else if (mc > 80) s += 0;               // 小盘股
    else s -= 8;                            // 微盘股，流动性风险

    // === 盈利质量交叉验证（PE+PB组合）===
    if (pe > 0 && pe < 20 && pb > 0 && pb < 2) {
      s += 8; // 低PE+低PB = 深度价值
    } else if (pe > 0 && pe < 30 && pb > 0 && pb < 3) {
      s += 3; // 合理组合
    } else if ((pe > 60 || pe < 0) && pb > 4) {
      s -= 8; // 高PE+高PB = 双重高估风险
    }

    return Math.max(0, Math.min(100, s));
  },

  _scoreTechnicalQuick(klines, quote) {
    // 技术面评分：MACD+RSI+均线系统+支撑压力位综合评估
    if (!klines || klines.length < 20) return 50;
    let s = 50;
    const closes = klines.map(k => k.close);
    const current = quote.price;

    // === MACD信号（核心趋势指标）===
    const macd = this.calcMACD(closes);
    if (macd) {
      // DIF和DEA都在零轴上方 = 多头市场
      if (macd.dif > 0 && macd.dea > 0) {
        s += 12;
        // MACD柱由负转正 = 金叉买入信号
        if (macd.macd > 0) s += 8;
      } else if (macd.dif > 0 && macd.dea <= 0) {
        // DIF上穿DEA = 金叉形成中
        s += 10;
      } else if (macd.dif < 0 && macd.dea < 0) {
        s -= 10;
        if (macd.macd < 0) s -= 6;
      } else if (macd.dif < 0 && macd.dea >= 0) {
        // 死叉形成中
        s -= 8;
      }
    }

    // === RSI指标（超买超卖判断）===
    const rsi = this.calcRSI(closes, 14);
    if (rsi >= 40 && rsi <= 60) {
      s += 5; // 中性区间，健康
    } else if (rsi > 30 && rsi < 40) {
      s += 10; // 接近超卖，可能反弹
    } else if (rsi > 20 && rsi <= 30) {
      s += 15; // 超卖区域，反弹概率大
    } else if (rsi <= 20) {
      s += 8; // 极度超卖，但可能继续下跌，给较少的分
    } else if (rsi > 60 && rsi <= 70) {
      s += 3; // 偏强
    } else if (rsi > 70 && rsi <= 80) {
      s -= 5; // 超买风险
    } else if (rsi > 80) {
      s -= 12; // 严重超买
    }

    // === 均线系统（趋势方向与强度）===
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);
    const ma60 = closes.length >= 60 ? this.calcMA(closes, 60) : null;

    if (ma5 && ma10 && ma20) {
      // 完美多头排列
      if (ma5 > ma10 && ma10 > ma20) {
        s += 15;
        if (ma60 && ma20 > ma60) s += 5; // 长周期也多头
      } else if (ma5 > ma10) {
        s += 8; // 短期多头
      } else if (ma5 < ma10 && ma10 < ma20) {
        s -= 12; // 空头排列
        if (ma60 && ma20 < ma60) s -= 5;
      } else if (ma5 < ma10) {
        s -= 5;
      }
    }

    // === 支撑压力位位置评估 ===
    const sr = this.calcSupportResistance(klines, current);
    if (sr.support > 0 && sr.resistance > 0) {
      const range = sr.resistance - sr.support;
      if (range > 0) {
        const position = (current - sr.support) / range;
        if (position > 0.8) s += 3;      // 接近压力位，强势
        else if (position > 0.5) s += 6;  // 中上区间，健康
        else if (position > 0.2) s += 2;  // 中下区间
        else s -= 5;                       // 接近支撑位，弱势
      }
    }

    // === 均线乖离率（BIAS）===
    if (ma20 && ma20 > 0) {
      const bias20 = (current - ma20) / ma20 * 100;
      if (bias20 > 15) s -= 10;       // 严重偏离均线，回调风险
      else if (bias20 > 8) s -= 3;    // 偏离较大
      else if (bias20 >= -3 && bias20 <= 5) s += 5; // 均线附近，健康
      else if (bias20 < -8) s += 8;   // 严重超跌，反弹机会
      else if (bias20 < -3) s += 3;   // 略低于均线
    }

    return Math.max(0, Math.min(100, s));
  },

  _scoreCapitalQuick(quote, klines) {
    // 资金面评分：换手率健康度+量价配合+资金撬动效率
    let s = 50;
    const turnover = quote.turnover || 0;
    const changePct = quote.changePct || 0;

    // === 换手率健康度评估 ===
    if (turnover >= 2 && turnover <= 5) s += 15;       // 温和活跃，最佳区间
    else if (turnover > 5 && turnover <= 8) s += 10;   // 较活跃
    else if (turnover > 1 && turnover < 2) s += 5;     // 偏低活跃
    else if (turnover > 8 && turnover <= 12) s += 0;   // 过度活跃，注意风险
    else if (turnover > 12 && turnover <= 20) s -= 8;  // 异常活跃，可能是出货
    else if (turnover > 20) s -= 15;                   // 极度异常
    else s -= 5;                                        // 几乎无交易

    // === 量价配合分析（核心）===
    if (klines && klines.length >= 20) {
      const vols = klines.map(k => k.volume);
      const closes = klines.map(k => k.close);
      const vol5 = vols.slice(-5).reduce((a,b) => a+b, 0) / 5;
      const vol20 = vols.slice(-20).reduce((a,b) => a+b, 0) / 20;

      if (vol20 > 0) {
        const volRatio = vol5 / vol20;

        // 放量上涨 = 主力资金进场（最佳信号）
        if (volRatio > 1.3 && changePct > 2) s += 18;
        else if (volRatio > 1.2 && changePct > 0) s += 12;
        // 缩量上涨 = 筹码锁定好，主力控盘
        else if (volRatio < 0.8 && changePct > 0 && changePct < 5) s += 10;
        // 放量下跌 = 主力出货（危险信号）
        else if (volRatio > 1.5 && changePct < -2) s -= 18;
        else if (volRatio > 1.3 && changePct < 0) s -= 12;
        // 缩量下跌 = 抛压减轻，可能见底
        else if (volRatio < 0.7 && changePct < 0 && changePct > -3) s += 3;
        // 平量平盘 = 观望
        else if (volRatio >= 0.8 && volRatio <= 1.2 && Math.abs(changePct) < 1) s += 2;
      }

      // === 资金撬动效率（小量大涨=主力高度控盘）===
      if (klines.length >= 5) {
        const lastVol = vols[vols.length - 1];
        const avgVol = vols.slice(-20).reduce((a,b) => a+b, 0) / Math.min(20, vols.length);
        if (avgVol > 0) {
          const efficiency = changePct / (lastVol / avgVol);
          if (efficiency > 3 && changePct > 3) s += 8;   // 高效撬动
          else if (efficiency > 2 && changePct > 1) s += 4;
        }
      }

      // === 连续量价趋势（3日趋势一致性）===
      if (klines.length >= 5) {
        let upVolUpPrice = 0, dnVolDnPrice = 0;
        for (let i = klines.length - 3; i < klines.length; i++) {
          const prev = klines[i-1], cur = klines[i];
          if (cur.volume > prev.volume && cur.close > prev.close) upVolUpPrice++;
          if (cur.volume < prev.volume && cur.close < prev.close) dnVolDnPrice++;
        }
        if (upVolUpPrice >= 2) s += 6;  // 连续放量上涨
        if (dnVolDnPrice >= 2) s += 4;  // 连续缩量下跌（抛压减轻）
      }
    }

    // === 当日量价快速判断 ===
    if (changePct > 0 && turnover >= 3 && turnover <= 8) s += 5;  // 温和放量上涨
    else if (changePct < -5 && turnover > 10) s -= 10;             // 放量大跌
    else if (changePct > 5 && turnover > 15) s -= 5;               // 天量天价风险

    return Math.max(0, Math.min(100, s));
  },

  _scoreValuationQuick(quote) {
    // 估值评分：PE/PB综合估值+安全边际评估（与基本面互补，侧重相对估值）
    let s = 50;
    const pe = quote.pe || 0;
    const pb = quote.pb || 0;

    // === PE估值分位评估 ===
    if (pe > 0 && pe < 8) s += 22;          // 极低PE，深度低估
    else if (pe >= 8 && pe < 15) s += 18;   // 低PE
    else if (pe >= 15 && pe < 25) s += 10;  // 合理
    else if (pe >= 25 && pe < 40) s += 0;   // 合理偏高
    else if (pe >= 40 && pe < 70) s -= 10;  // 偏高
    else if (pe >= 70) s -= 20;             // 泡沫区域
    else s -= 12;                           // 亏损

    // === PB估值分位评估 ===
    if (pb > 0 && pb < 0.8) s += 20;        // 深度破净
    else if (pb >= 0.8 && pb < 1.5) s += 15; // 破净或接近
    else if (pb >= 1.5 && pb < 2.5) s += 8;  // 合理
    else if (pb >= 2.5 && pb < 4) s += 0;    // 偏高
    else if (pb >= 4 && pb < 8) s -= 8;      // 高估
    else if (pb >= 8) s -= 15;               // 严重高估
    else s -= 10;                            // 负净资产

    // === PE+PB联合安全边际 ===
    if (pe > 0 && pe < 15 && pb > 0 && pb < 1.5) {
      s += 10; // 双低估值，极高安全边际
    } else if (pe > 0 && pe < 25 && pb > 0 && pb < 2.5) {
      s += 4;  // 合理估值组合
    } else if ((pe > 50 || pe < 0) && (pb > 4 || pb < 0)) {
      s -= 10; // 双重高估，极高风险
    }

    // === 市值与估值匹配度 ===
    const mc = quote.marketCap || 0;
    if (mc > 500 && pe > 0 && pe < 20) s += 5;   // 大盘低估值，白马股
    else if (mc < 50 && pe > 40) s -= 8;          // 小盘高估值，泡沫风险大
    else if (mc > 200 && pb > 0 && pb < 1.5) s += 5; // 中大盘低PB

    return Math.max(0, Math.min(100, s));
  },

  _scoreSentimentQuick(quote, klines) {
    // 情绪面评分：RSI动量+波动率+短期趋势一致性+市场情绪
    let s = 50;
    const changePct = quote.changePct || 0;

    // === RSI动量指标（市场情绪温度计）===
    if (klines && klines.length >= 15) {
      const closes = klines.map(k => k.close);
      const rsi6 = this.calcRSI(closes, 6);   // 短期RSI
      const rsi14 = this.calcRSI(closes, 14);  // 中期RSI

      // RSI6 短期情绪
      if (rsi6 >= 40 && rsi6 <= 60) s += 8;       // 情绪稳定
      else if (rsi6 > 25 && rsi6 < 40) s += 12;   // 超卖反弹机会
      else if (rsi6 > 60 && rsi6 < 75) s += 5;    // 偏强
      else if (rsi6 >= 75 && rsi6 < 85) s -= 5;   // 过热
      else if (rsi6 >= 85) s -= 12;                // 极度狂热
      else if (rsi6 <= 25) s += 6;                 // 极度恐慌（逆向机会但风险大）

      // RSI6与RSI14的背离检测
      if (rsi14 > 0) {
        const divergence = rsi6 - rsi14;
        if (divergence > 15 && rsi6 < 50) s += 5;  // 短期超卖但中期尚可，反弹信号
        if (divergence < -15 && rsi6 > 50) s -= 5;  // 短期超买但中期一般，回调信号
      }
    }

    // === 波动率评估（市场恐慌度）===
    if (klines && klines.length >= 10) {
      const closes = klines.map(k => k.close);
      const changes = [];
      for (let i = closes.length - 10; i < closes.length; i++) {
        changes.push((closes[i] - closes[i-1]) / closes[i-1] * 100);
      }
      const avgAbsChange = changes.reduce((a,b) => a + Math.abs(b), 0) / changes.length;

      if (avgAbsChange < 1.5) s += 10;        // 低波动，市场平静
      else if (avgAbsChange < 3) s += 5;      // 正常波动
      else if (avgAbsChange < 5) s += 0;      // 波动偏大
      else if (avgAbsChange > 7) s -= 10;     // 剧烈波动，恐慌
    }

    // === 短期趋势一致性（5日方向）===
    if (klines && klines.length >= 6) {
      const recent = klines.slice(-5);
      let upDays = 0, dnDays = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].close > recent[i-1].close) upDays++;
        else dnDays++;
      }
      if (upDays >= 4) s += 8;               // 连续上涨，情绪高涨
      else if (upDays === 3) s += 5;
      else if (dnDays >= 4) s -= 8;           // 连续下跌，恐慌
      else if (dnDays === 3) s -= 4;
    }

    // === 当日涨跌幅情绪 ===
    if (changePct > 0 && changePct < 2) s += 6;       // 温和上涨，健康
    else if (changePct >= 2 && changePct < 5) s += 3;  // 较强上涨
    else if (changePct >= 5 && changePct < 8) s += 0;  // 大涨，追高风险
    else if (changePct >= 8) s -= 8;                    // 涨停附近，过热
    else if (changePct < 0 && changePct >= -2) s += 2;  // 微跌，正常
    else if (changePct < -2 && changePct >= -5) s -= 3; // 明显下跌
    else if (changePct < -5 && changePct >= -8) s -= 6; // 大跌
    else if (changePct < -8) s -= 10;                   // 跌停附近

    return Math.max(0, Math.min(100, s));
  }
};

// ============================================================
// 4. DataAPI - 数据获取API
// ============================================================
const DataAPI = {
  // === 数据缓存层 ===
  _cache: {},
  _cacheTTL: {
    quote: 15000,      // 实时行情15秒
    kline: 60000,      // K线60秒
    marketRanking: 30000, // 排行30秒
    capitalFlow: 30000,   // 资金流向30秒
    capitalFlowStock: 120000, // 个股资金流向2分钟
    news: 120000,     // 新闻120秒
    topMarketStocks: 300000 // 全市场活跃股5分钟（次日概率扫描用）
  },
  _cacheGet(key, type) {
    const c = this._cache[key];
    if (!c) return null;
    const ttl = this._cacheTTL[type] || 30000;
    if (Date.now() - c.ts > ttl) return null;
    return c.data;
  },
  _cacheSet(key, type, data) {
    this._cache[key] = { ts: Date.now(), data };
  },

  /** JSONP请求（用于无CORS头的API，如腾讯smartbox） */
  _jsonp(url, globalVar, timeout) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeout || 8000);
      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      script.onload = () => {
        try {
          const val = window[globalVar];
          cleanup();
          resolve(val || '');
        } catch (e) {
          cleanup();
          reject(e);
        }
      };
      script.onerror = () => { cleanup(); reject(new Error('JSONP load error')); };
      script.src = url;
      document.head.appendChild(script);
    });
  },

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

      // 腾讯无数据时，用东方财富K线多通道备用（push2his主，push2/82.push2备）
      if (code.startsWith('bj') || code.startsWith('sh') || code.startsWith('sz')) {
        const emCode = code.substring(2);
        let market = 1; // 沪市
        if (code.startsWith('sz')) market = 0;
        if (code.startsWith('bj')) market = 0;
        const secid = market + '.' + emCode;
        const emDomains = ['push2his.eastmoney.com', 'push2.eastmoney.com', '82.push2.eastmoney.com'];
        for (const dom of emDomains) {
          try {
            const emUrl = `https://${dom}/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&lmt=${count}&end=20500101`;
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 8000);
            const emResp = await fetch(emUrl, { signal: ctrl.signal });
            clearTimeout(timer);
            const emData = await emResp.json();
            if (emData && emData.data && Array.isArray(emData.data.klines) && emData.data.klines.length > 0) {
              return emData.data.klines.map(line => {
                const f = line.split(',');
                return {
                  date: f[0], open: +f[1], close: +f[2], high: +f[3], low: +f[4],
                  volume: +f[5], amount: +f[6]
                };
              });
            }
          } catch (e2) { continue; } // 该通道失败，切下一通道
        }
      }

      return [];
    } catch (e) {
      console.error('fetchKline error:', e);
      return [];
    }
  },

  /** 搜索股票 - 东方财富主源 + 腾讯smartbox备用源，支持全类型股票 */
  async searchStock(keyword) {
    // 主源：东方财富
    try {
      const url = `${CONFIG.EM_SEARCH}?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=20`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.QuotationCodeTable && data.QuotationCodeTable.Data) {
        const results = data.QuotationCodeTable.Data
          .filter(item => /^\d{6}$/.test(item.Code))
          .map(item => {
            const code = item.Code;
            let prefix;
            const mkt = String(item.MktNum);
            if (mkt === '1') {
              prefix = 'sh';
            } else if (mkt === '0') {
              if (code.startsWith('8') || code.startsWith('9') || code.startsWith('43') || code.startsWith('4')) prefix = 'bj';
              else prefix = 'sz';
            } else {
              if (code.startsWith('6') || code.startsWith('5') || code.startsWith('11') || code.startsWith('9')) prefix = 'sh';
              else if (code.startsWith('8') || code.startsWith('4')) prefix = 'bj';
              else prefix = 'sz';
            }
            return {
              name: item.Name || code,
              code: code,
              market: prefix,
              fullName: `${item.Name || code}(${code})`,
              fullCode: prefix + code
            };
          });
        if (results.length > 0) return results;
      }
    } catch (e) {
      console.warn('东方财富搜索失败，尝试腾讯备用源:', e.message);
    }
    // 备用源：腾讯smartbox（JSONP方式）
    try {
      const url = `${CONFIG.TENCENT_SEARCH}?t=all&q=${encodeURIComponent(keyword)}`;
      const raw = await this._jsonp(url, 'v_hint', 6000);
      // 格式: v_hint="sh~600519~贵州茅台~gzmt~GP-A^sz~000858~五粮液~wly~GP-A^..."
      if (raw && typeof raw === 'string') {
        return raw.split('^').map(line => {
          const parts = line.split('~');
          if (parts.length < 3) return null;
          const market = parts[0]; // sh/sz/bj
          const code = parts[1];
          const name = parts[2];
          if (!/^\d{6}$/.test(code)) return null;
          // 腾讯市场前缀标准化
          let prefix = market;
          if (market === 'sh' || market === 'sz' || market === 'bj') {
            // ok
          } else if (code.startsWith('6') || code.startsWith('5') || code.startsWith('11')) {
            prefix = 'sh';
          } else if (code.startsWith('8') || code.startsWith('4')) {
            prefix = 'bj';
          } else {
            prefix = 'sz';
          }
          return {
            name: name || code,
            code: code,
            market: prefix,
            fullName: `${name || code}(${code})`,
            fullCode: prefix + code
          };
        }).filter(Boolean);
      }
    } catch (e2) {
      console.error('腾讯搜索备用源也失败:', e2.message);
    }
    return [];
  },

  /** 多通道请求东方财富clist接口（板块/排行/成分股容灾，主域失败自动切延时备份域） */
  async _fetchEMClist(queryStr) {
    const channels = CONFIG.EM_CLIST_CHANNELS;
    for (let i = 0; i < channels.length; i++) {
      try {
        const resp = await fetch(channels[i] + '?' + queryStr);
        const text = await resp.text();
        const json = this._parseEastMoneyResp(text);
        if (json && json.data && Array.isArray(json.data.diff)) {
          return json;
        }
      } catch (e) {
        console.warn('clist通道' + i + '失败:', e.message);
      }
    }
    return null;
  },

  /** 获取全市场股票排行（按成交额排序，取前N只） - 双域名容灾 */
  async fetchMarketRanking(topN) {
    topN = topN || 300;
    const cacheKey = 'ranking_' + topN;
    const cached = this._cacheGet(cacheKey, 'marketRanking');
    if (cached) return cached;
    try {
      const queryStr = 'pn=1&pz=' + topN + '&po=1&np=1&fltt=2&invt=2&fid=f6&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81&fields=f2,f3,f4,f5,f6,f7,f8,f9,f12,f14,f15,f16,f17,f18,f20,f21,f23';
      const data = await this._fetchEMClist(queryStr);
      let result = [];
      if (data) {
        result = data.data.diff.map(item => {
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
      this._cacheSet(cacheKey, 'marketRanking', result);
      return result;
    } catch (e) {
      console.error('fetchMarketRanking error:', e);
      return [];
    }
  },

  /** 多通道获取东方财富资金流向日K线（三通道容灾，返回 {klines, source} 或 null） */
  async _fetchEMCapitalKlines(secid, lmt, klt) {
    klt = klt || 101;
    const fields1 = 'f1,f2,f3,f7';
    const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65';
    const channels = CONFIG.EM_CAPITAL_CHANNELS;
    const labels = ['主通道', '备用通道1', '备用通道2'];
    let lastErr = null;

    for (let i = 0; i < channels.length; i++) {
      try {
        const url = `${channels[i]}?secid=${secid}&fields1=${fields1}&fields2=${fields2}&klt=${klt}&lmt=${lmt}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000); // 8秒超时切下一通道
        const resp = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) { lastErr = new Error('HTTP ' + resp.status); continue; }
        const text = await resp.text();
        const data = this._parseEastMoneyResp(text);
        if (data && data.data && data.data.klines && data.data.klines.length > 0) {
          return { klines: data.data.klines, source: labels[i] };
        }
        lastErr = new Error('空数据');
      } catch (e) {
        lastErr = e;
        continue; // 立即切下一通道
      }
    }
    console.warn('所有资金流向通道均失败:', lastErr && lastErr.message);
    return null;
  },

  /** 获取资金流向（近5日，三通道容灾） */
  async fetchCapitalFlow(code) {
    const cacheKey = 'capitalFlow_' + code;
    const cached = this._cacheGet(cacheKey, 'capitalFlow');
    if (cached) return cached;
    try {
      const secid = code.startsWith('sh') ? `1.${code.substring(2)}` : `0.${code.substring(2)}`;
      const res = await this._fetchEMCapitalKlines(secid, 5);
      let result = [];
      if (res) {
        result = res.klines.map(line => {
          const f = line.split(',');
          return {
            date: f[0],
            mainIn: +f[1],
            smallIn: +f[2],
            medIn: +f[3],
            bigIn: +f[4],
            superIn: +f[5]
          };
        });
        result._source = res.source; // 记录数据来源通道
      }
      this._cacheSet(cacheKey, 'capitalFlow', result);
      return result;
    } catch (e) {
      console.error('fetchCapitalFlow error:', e);
      return [];
    }
  },

  /** 获取公告新闻 */
  async fetchNews(code) {
    const cacheKey = 'news_' + code;
    const cached = this._cacheGet(cacheKey, 'news');
    if (cached) return cached;
    try {
      const stockCode = code.substring(2);
      const url = `${CONFIG.EM_NEWS}?sr=-1&page_size=10&page_index=1&ann_type=A&stock_list=${stockCode}&f_node=0&s_node=0`;
      const resp = await fetch(url);
      const text = await resp.text();
      const data = this._parseEastMoneyResp(text);
      let result = [];
      if (data && data.data && data.data.list) {
        result = data.data.list.map(item => ({
          title: item.title || '',
          time: item.notice_date || '',
          type: item.columns ? item.columns[0]?.column_name : '公告'
        }));
      }
      this._cacheSet(cacheKey, 'news', result);
      return result;
    } catch (e) {
      console.error('fetchNews error:', e);
      return [];
    }
  },

  /** 通用解析东方财富API响应（兼容JSON/JSONP/带cb=/不带cb=等多种格式） */
  _parseEastMoneyResp(text) {
    if (!text) return null;
    let s = text.trim();
    // 移除开头/结尾空白
    s = s.replace(/^\s+|\s+$/g, '');
    // 移除 JSONP 回调: xxx({...}) 或 xxx({...});
    const m = s.match(/^\w+\s*\(\s*([\s\S]+?)\s*\);?$/);
    if (m) s = m[1];
    // 移除末尾分号
    s = s.replace(/;\s*$/, '');
    try {
      return JSON.parse(s);
    } catch (e) {
      console.warn('_parseEastMoneyResp JSON parse failed, raw=', text.substring(0, 200));
      return null;
    }
  },

  /** 获取板块排行（行业板块 m:90+t:2，按涨幅排序） */
  async fetchSectorRank(topN = 10) {
    const cacheKey = 'sectorRank_industry_' + topN;
    const cached = this._cacheGet(cacheKey, 'sectorRank');
    if (cached) return cached;
    try {
      const queryStr = `fid=f3&po=1&pz=${topN}&pn=1&np=1&fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&fs=m:90+t:2&fields=f2,f3,f8,f12,f14,f62,f104,f105`;
      const json = await this._fetchEMClist(queryStr);
      if (!json) {
        console.warn('fetchSectorRank 所有通道失败');
        return [];
      }
      const result = json.data.diff.map(item => ({
        code: String(item.f12 || ''),
        name: String(item.f14 || ''),
        changePct: parseFloat(item.f3) || 0,
        mainFlow: parseFloat(item.f62) || 0,
        turnoverPct: parseFloat(item.f8) || 0,
        upCount: parseInt(item.f104) || 0,
        downCount: parseInt(item.f105) || 0,
      })).filter(s => s.code && s.name);
      this._cacheSet(cacheKey, 'sectorRank', result);
      return result;
    } catch (e) {
      console.error('fetchSectorRank error:', e);
      return [];
    }
  },

  /** 获取概念板块排行（m:90+t:3，行业板块失败时的降级方案） */
  async fetchConceptSectors(topN = 10) {
    const cacheKey = 'sectorRank_concept_' + topN;
    const cached = this._cacheGet(cacheKey, 'sectorRank');
    if (cached) return cached;
    try {
      const queryStr = `fid=f3&po=1&pz=${topN}&pn=1&np=1&fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&fs=m:90+t:3&fields=f2,f3,f8,f12,f14,f62,f104,f105`;
      const json = await this._fetchEMClist(queryStr);
      if (!json) return [];
      const result = json.data.diff.map(item => ({
        code: String(item.f12 || ''),
        name: String(item.f14 || ''),
        changePct: parseFloat(item.f3) || 0,
        mainFlow: parseFloat(item.f62) || 0,
        turnoverPct: parseFloat(item.f8) || 0,
        upCount: parseInt(item.f104) || 0,
        downCount: parseInt(item.f105) || 0,
      })).filter(s => s.code && s.name);
      this._cacheSet(cacheKey, 'sectorRank', result);
      return result;
    } catch (e) {
      console.error('fetchConceptSectors error:', e);
      return [];
    }
  },

  /** 获取板块内成分股（按主力净流入排序） */
  async fetchSectorStocks(sectorCode, topN = 4) {
    const cacheKey = 'sectorStocks_' + sectorCode + '_' + topN;
    const cached = this._cacheGet(cacheKey, 'sectorStocks');
    if (cached) return cached;
    try {
      const queryStr = `fid=f62&po=1&pz=${topN}&pn=1&np=1&fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&fs=b:${sectorCode}+f:!50&fields=f2,f3,f5,f6,f7,f8,f9,f12,f14,f15,f16,f20,f23,f62`;
      const json = await this._fetchEMClist(queryStr);
      if (!json) {
        console.warn('fetchSectorStocks', sectorCode, '所有通道失败');
        return [];
      }
      const result = json.data.diff.map(item => {
        const rawCode = String(item.f12 || '');
        const price = parseFloat(item.f2);
        if (!rawCode || !(price > 0)) return null;
        let prefix = 'sz';
        if (rawCode.startsWith('6')) prefix = 'sh';
        else if (rawCode.startsWith('8') || rawCode.startsWith('4')) prefix = 'bj';
        return {
          code: prefix + rawCode,
          rawCode,
          name: String(item.f14 || ''),
          price,
          changePct: parseFloat(item.f3) || 0,
          volume: parseFloat(item.f5) || 0,
          amount: parseFloat(item.f6) || 0,
          amplitude: parseFloat(item.f7) || 0,
          turnover: parseFloat(item.f8) || 0,
          pe: parseFloat(item.f9) || 0,
          mainFlow: parseFloat(item.f62) || 0,
          pb: parseFloat(item.f23) || 0,
          marketCap: parseFloat(item.f20) ? parseFloat(item.f20) / 1e8 : 0,
        };
      }).filter(Boolean);
      this._cacheSet(cacheKey, 'sectorStocks', result);
      return result;
    } catch (e) {
      console.error('fetchSectorStocks error:', e);
      return [];
    }
  },

  /** 全市场活跃股（按成交额排序）—— 板块API全部失败时的最终降级 */
  async fetchTopMarketStocks(topN = 50) {
    const cacheKey = 'topMarketStocks_' + topN;
    const cached = this._cacheGet(cacheKey, 'topMarketStocks');
    if (cached) return cached;
    try {
      // fs: 沪深A股（主板+创业板+科创板+北交所），双域名容灾
      // clist接口单页最多返回100条，topN>100时分页拉取合并（覆盖中小盘活跃股）
      const pageSize = 100;
      const pages = Math.max(1, Math.ceil(topN / pageSize));
      let merged = [];
      for (let pn = 1; pn <= pages; pn++) {
        const queryStr = `fid=f6&po=1&pz=${pageSize}&pn=${pn}&np=1&fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81&fields=f2,f3,f5,f6,f7,f8,f9,f12,f14,f15,f16,f20,f23,f62`;
        const json = await this._fetchEMClist(queryStr);
        if (!json || !json.data || !Array.isArray(json.data.diff)) break;
        merged = merged.concat(json.data.diff);
        if (json.data.diff.length < pageSize) break; // 末页
      }
      if (merged.length === 0) return [];
      const result = merged.map(item => {
        const rawCode = String(item.f12 || '');
        const price = parseFloat(item.f2);
        if (!rawCode || !(price > 0)) return null;
        let prefix = 'sz';
        if (rawCode.startsWith('6')) prefix = 'sh';
        else if (rawCode.startsWith('8') || rawCode.startsWith('4')) prefix = 'bj';
        return {
          code: prefix + rawCode,
          rawCode,
          name: String(item.f14 || ''),
          price,
          changePct: parseFloat(item.f3) || 0,
          volume: parseFloat(item.f5) || 0,
          amount: parseFloat(item.f6) || 0,
          amplitude: parseFloat(item.f7) || 0,
          turnover: parseFloat(item.f8) || 0,
          pe: parseFloat(item.f9) || 0,
          mainFlow: parseFloat(item.f62) || 0,
          pb: parseFloat(item.f23) || 0,
          marketCap: parseFloat(item.f20) ? parseFloat(item.f20) / 1e8 : 0,
        };
      }).filter(Boolean).slice(0, topN);
      this._cacheSet(cacheKey, 'topMarketStocks', result);
      return result;
    } catch (e) {
      console.error('fetchTopMarketStocks error:', e);
      return [];
    }
  },

  /** 获取单只股票近N日主力资金流向（三通道容灾，用于近2日累计） */
  async fetchCapitalFlowStock(code, days = 3) {
    const cacheKey = 'cf_' + code + '_' + days;
    const cached = this._cacheGet(cacheKey, 'capitalFlowStock');
    if (cached) return cached;
    try {
      const rawCode = code.replace(/^(sh|sz|bj)/, '');
      const secid = (code.startsWith('sh') ? '1.' : '0.') + rawCode;
      const res = await this._fetchEMCapitalKlines(secid, days);
      // 解析每日数据: 日期,主力净流入,小单净流入,中单净流入,大单净流入,超大单净流入,...
      const flows = (res ? res.klines : []).map(line => {
        const parts = line.split(',');
        return {
          date: parts[0],
          main: parseFloat(parts[1]) || 0,       // 主力净流入
          small: parseFloat(parts[2]) || 0,      // 小单
          mid: parseFloat(parts[3]) || 0,        // 中单
          big: parseFloat(parts[4]) || 0,        // 大单
          superBig: parseFloat(parts[5]) || 0,   // 超大单
        };
      });
      // 计算近2日主力累计
      const recent2 = flows.slice(-2);
      const mainFlowSum2 = recent2.reduce((s, f) => s + f.main, 0);
      // 今日主力/成交额（用行情估算）
      const today = flows.length > 0 ? flows[flows.length - 1] : null;
      const payload = { flows, mainFlowSum2, today, source: res ? res.source : null };
      this._cacheSet(cacheKey, 'capitalFlowStock', payload);
      return payload;
    } catch (e) {
      console.error('fetchCapitalFlowStock error:', e);
      return { flows: [], mainFlowSum2: 0, today: null };
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
    // 纯数字/带前缀代码才走代码直接匹配，中文/拼音直接走搜索
    const isCodeLike = /^[a-z]{2}\d{5,6}$/i.test(keyword) || /^\d{5,6}$/.test(keyword);
    if (isCodeLike) {
      const normalized = Utils.normalizeCode(keyword);
      if (normalized) {
        const quote = await DataAPI.fetchQuote(normalized);
        if (quote) {
          results = [{ name: quote.name, code: normalized, fullCode: normalized, market: normalized.startsWith('sh') ? '上证' : normalized.startsWith('bj') ? '北交所' : '深证' }];
        }
      }
    }
    // 如果代码没匹配到，搜索名称/拼音
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
    return Math.round(Math.max(0, Math.min(100, score)));
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
    return Math.round(Math.max(0, Math.min(100, score)));
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
    return Math.round(Math.max(0, Math.min(100, score)));
  },

  /** 资金面评分 */
  scoreCapital(capitalFlow) {
    if (!capitalFlow || capitalFlow.length === 0) return 50;
    let score = 50;
    const recent5 = capitalFlow.slice(-5);
    const totalFlow = recent5.reduce((sum, d) => sum + d.mainIn, 0);
    if (totalFlow > 0) {
      score += Math.min(30, Math.round(totalFlow / 1e8 * 3));
    } else {
      score += Math.max(-30, Math.round(totalFlow / 1e8 * 3));
    }
    // 连续流入天数
    let consecIn = 0;
    for (let i = recent5.length - 1; i >= 0; i--) {
      if (recent5[i].mainIn > 0) consecIn++;
      else break;
    }
    if (consecIn >= 3) score += 10;
    if (consecIn === 0) score -= 5;
    return Math.round(Math.max(0, Math.min(100, score)));
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
    return Math.round(Math.max(0, Math.min(100, score)));
  },

  /** 消息面评分（基于基本面指标推算，无独立新闻API） */
  scoreMessage(quote) {
    let score = 55;
    // 通过价格和成交量异动推算消息面
    if (quote.changePct > 3) score += 10;
    if (quote.changePct < -3) score -= 10;
    if (quote.turnover > 8) score += 5; // 高关注度
    return Math.round(Math.max(0, Math.min(100, score)));
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
    return Math.round(Math.max(0, Math.min(100, score)));
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
    return Math.round(Math.max(0, Math.min(100, score)));
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
    // 数据来源标识
    const src = capitalFlow._source || '主通道';
    const badgeCls = src === '主通道' ? 'ds-badge ds-ok' : 'ds-badge ds-backup';
    html += `<div class="data-source-tag"><span class="${badgeCls}">数据来源：东方财富·${src}</span></div>`;
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

  /** 模块6：操作处置方案（合并原模块8场景指引） */
  module6_Optimization(data) {
    const { quote, klines, scores } = data;
    const totalScore = scores.total;
    const current = quote.price;
    const sr = Utils.calcSupportResistance(klines, current);
    let html = '';

    // 处置建议
    let action = '', actionCls = '', detail = '';
    if (totalScore >= 80) {
      action = '持有/加仓'; actionCls = 'action-hold';
      detail = '基本面与技术面均表现良好，建议持有或逢低加仓。';
    } else if (totalScore >= 65) {
      action = '逢低建仓'; actionCls = 'action-hold';
      detail = '量化评分较高，可分批建仓，以20日VWAP为参考成本线。';
    } else if (totalScore >= 50) {
      action = '观望为主'; actionCls = 'action-reduce';
      detail = '部分指标出现预警信号，建议等待放量突破或回踩支撑位再决策。';
    } else if (totalScore >= 35) {
      action = '谨慎减仓'; actionCls = 'action-reduce';
      detail = '多项指标偏弱，建议逢高减仓降低风险敞口，空仓者暂勿入场。';
    } else {
      action = '回避/止损'; actionCls = 'action-sell';
      detail = '风险因子较多，建议果断止损离场，不补仓摊低成本。';
    }

    html += `<div class="conclusion">🎯 处置建议：<span class="action-tag ${actionCls}">${action}</span></div>`;
    html += `<p>${detail}</p>`;

    // 分场景简要操作提示（精简合并，不展开长段落）
    html += '<p style="margin-top:10px"><strong>【分场景操作提示】</strong></p>';
    if (totalScore >= 65) {
      // 适合建仓/持有
      html += '<p>📌 <b>空仓待入：</b>';
      if (current <= sr.support * 1.02) {
        html += `当前接近支撑位，可试探性建仓，首次不超过计划仓位1/3，止损${Math.min(sr.support, current * 0.92).toFixed(2)}。</p>`;
      } else {
        html += `等待回调至${(sr.support * 1.01).toFixed(2)}-${(sr.support * 1.05).toFixed(2)}区间再入场，不追高。</p>`;
      }
      html += '<p>📌 <b>已持仓：</b>到达压力位附近减仓1/3锁定利润，止损上移至成本价上方保本。</p>';
    } else if (totalScore >= 35) {
      // 中性偏弱
      html += '<p>📌 <b>空仓：</b>评分中等，等待明确突破信号再入场。</p>';
      html += '<p>📌 <b>已持仓：</b>逢高减仓1/3~1/2，跌破止损价果断离场。</p>';
    } else {
      // 高风险
      html += '<p>📌 <b>空仓：</b>风险较高，暂勿入场。</p>';
      html += `<p>📌 <b>已持仓：</b>建议尽快止损，止损价${Math.min(sr.support, current * 0.92).toFixed(2)}，不要补仓摊低成本。</p>`;
    }

    return html;
  },

  /** 模块7：仓位管理（止损/支撑/压力已在顶部摘要卡片显示，此处不重复） */
  module7_RiskControl({ quote }) {
    let html = '';
    // 单票仓位上限
    let maxPosition = 20;
    if (quote.marketCap && quote.marketCap > 500) maxPosition = 25;
    if (quote.pe > 40 || quote.pb > 5) maxPosition = Math.min(maxPosition, 15);
    html += `<div class="metric-row">
      <span class="metric-label">单票仓位上限</span>
      <span class="metric-val">${maxPosition}%</span>
    </div>`;
    if (quote.pe > 40 || quote.pb > 5) {
      html += '<p style="font-size:12px;color:var(--text-secondary)">⚠ 高估值个股（PE>40或PB>5），建议仓位降至15%以下。</p>';
    } else {
      html += '<p style="font-size:12px;color:var(--text-secondary)">单只股票建议不超过总资金20%，大盘蓝筹可放宽至25%。</p>';
    }
    // 总仓位管控
    html += `<div class="metric-row">
      <span class="metric-label">建议总仓位</span>
      <span class="metric-val">50%-70%</span>
    </div>`;
    html += '<p style="font-size:12px;color:var(--text-secondary)">保留30%-50%现金应对系统性风险，不追满仓操作。</p>';
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

  /** 运行选股（全市场覆盖+五维评分+风控+行业分散+动量因子） */
  async run(strategy) {
    const container = document.getElementById('screenerResults');
    const infoEl = document.getElementById('screenerInfo');
    const card = document.getElementById('screenerResultCard');
    
    container.innerHTML = '<div class="loading-pulse"><span class="loading-spinner"></span>正在获取全市场数据并多维筛选...</div>';
    card.style.display = 'block';
    infoEl.textContent = '';

    // === 全市场获取：扩大到1500只，覆盖所有类型 ===
    const fetchSize = strategy === 'msci' ? 1500 : 800;
    const marketRanking = await DataAPI.fetchMarketRanking(fetchSize);
    if (!marketRanking || marketRanking.length === 0) {
      container.innerHTML = '<div class="empty-tip">全市场数据获取失败，请刷新重试</div>';
      return;
    }
    
    const allQuotes = {};
    marketRanking.forEach(item => { allQuotes[item.code] = item; });
    infoEl.textContent = `已从全市场 ${marketRanking.length} 只股票中筛选`;

    // === 第一轮：风控过滤（纯数据，速度快） ===
    const riskFiltered = [];
    const riskStats = { ST: 0, limitUp: 0, limitDown: 0, abnormalTurnover: 0, lowPrice: 0 };
    Object.entries(allQuotes).forEach(([code, q]) => {
      if (q.name && (q.name.includes('ST') || q.name.includes('*ST'))) { riskStats.ST++; return; }
      if (!q.price || q.price <= 0 || q.volume <= 0) return;
      if (q.amount < 3000) return;
      if (q.changePct >= 9.9) { riskStats.limitUp++; return; }
      if (q.changePct <= -9.9) { riskStats.limitDown++; return; }
      if (q.turnover > 25) { riskStats.abnormalTurnover++; return; }
      if (q.price < 2) { riskStats.lowPrice++; return; }
      riskFiltered.push([code, q]);
    });

    // === 第二轮：快速预评分（不用K线，纯行情数据打分） ===
    const preScored = riskFiltered.map(([code, q]) => {
      let preScore = 0;
      const pe = q.pe || 999;
      const pb = q.pb || 999;
      const sector = CONFIG.SECTORS[code] || { name: '未知', type: '服务' };

      // 估值合理性
      if (pe > 0 && pe < 20) preScore += 15;
      else if (pe > 0 && pe < 35) preScore += 8;
      else if (pe >= 60 || pe < 0) preScore -= 10;
      if (pb > 0 && pb < 2) preScore += 10;
      else if (pb >= 5) preScore -= 5;

      // 市值（MSCI策略权重更高）
      if (strategy === 'msci') {
        if (q.marketCap > 2000) preScore += 25;
        else if (q.marketCap > 1000) preScore += 18;
        else if (q.marketCap > 500) preScore += 10;
        else if (q.marketCap > 200) preScore += 3;
      } else {
        if (q.marketCap > 500) preScore += 10;
        else if (q.marketCap > 200) preScore += 5;
      }

      // 换手率适中
      if (q.turnover > 1 && q.turnover < 10) preScore += 5;
      // 涨跌幅适中（不暴涨暴跌）
      if (Math.abs(q.changePct) < 3) preScore += 5;
      if (Math.abs(q.changePct) > 7) preScore -= 5;

      // 行业周期
      const cycle = CONFIG.INDUSTRY_CYCLE[sector.type] || 'mature';
      if (cycle === 'rising') preScore += 10;
      else if (cycle === 'cyclical_up') preScore += 6;
      else if (cycle === 'declining') preScore -= 5;

      return { code, q, preScore, sector, cycle };
    });

    // 按预评分排序，取前80名进入精细评估
    preScored.sort((a, b) => b.preScore - a.preScore);
    const topCandidates = preScored.slice(0, 80);

    // === 第三轮：精细五维评分（需要K线数据，只对top80获取） ===
    infoEl.textContent = `风控过滤后 ${riskFiltered.length} 只 → 精细评估前 ${topCandidates.length} 只（获取K线数据中...）`;
    
    const scoredCandidates = [];
    for (const { code, q, preScore, sector, cycle } of topCandidates) {
      let klines = [];
      try {
        klines = await DataAPI.fetchKline(code);
      } catch(e) { klines = []; }

      const quoteForScore = {
        code, name: q.name, price: q.price, changePct: q.changePct,
        pe: q.pe, pb: q.pb, marketCap: q.marketCap,
        turnover: q.turnover, volume: q.volume, amount: q.amount
      };

      const scores = Utils.fiveDimScore(quoteForScore, klines);

      // 动量因子（5日涨幅趋势）
      let momentumScore = 0;
      if (klines.length >= 5) {
        const recent5 = klines.slice(-5);
        const priceStart = recent5[0].open;
        const priceEnd = recent5[recent5.length - 1].close;
        const momentum5d = priceStart > 0 ? ((priceEnd - priceStart) / priceStart) * 100 : 0;
        if (momentum5d >= 2 && momentum5d <= 8) momentumScore = 8;
        else if (momentum5d > 0 && momentum5d < 2) momentumScore = 4;
        else if (momentum5d > 8 && momentum5d <= 15) momentumScore = 2;
        else if (momentum5d > 15) momentumScore = -5;
        else if (momentum5d >= -3 && momentum5d < 0) momentumScore = 0;
        else momentumScore = -3;
      }

      const totalScore = scores.total + momentumScore;
      const tags = [];
      if (scores.dims.fundamental >= 70) tags.push('📊基本面优');
      if (scores.dims.technical >= 70) tags.push('📈技术面强');
      if (scores.dims.capital >= 70) tags.push('💰资金流入');
      if (scores.dims.valuation >= 70) tags.push('💎估值合理');
      if (cycle === 'rising') tags.push('📈行业上升期');
      else if (cycle === 'cyclical_up') tags.push('🔄周期上行');
      
      // MSCI风格策略标签
      if (strategy === 'msci') {
        if (q.marketCap > 1000) tags.push('🏦大盘蓝筹');
        if (q.pe > 0 && q.pe < 20 && q.pb > 0 && q.pb < 2) tags.push('💎价值洼地');
        if (q.amount > 50000) tags.push('💧流动性佳');
        const capRank = marketRanking.filter(m => m.marketCap > q.marketCap).length + 1;
        if (capRank <= 50) tags.push('🏆MSCI龙头');
      }

      scoredCandidates.push({
        code, name: q.name, price: q.price,
        change: q.changePct,
        pe: q.pe || 999, pb: q.pb || 999,
        marketCap: q.marketCap,
        turnover: q.turnover,
        score: Math.round(totalScore),
        fiveDimScore: scores.total,
        momentum: momentumScore,
        sector: sector.name,
        sectorType: sector.type,
        cycle, tags,
        dims: scores.dims
      });
    }

    // === 第四轮：行业分散度控制 ===
    scoredCandidates.sort((a, b) => b.score - a.score);
    const sectorCount = {};
    const diversified = [];
    const maxPerSector = strategy === 'msci' ? 4 : 3;
    for (const c of scoredCandidates) {
      const sectorKey = c.sector;
      sectorCount[sectorKey] = (sectorCount[sectorKey] || 0) + 1;
      if (sectorCount[sectorKey] <= maxPerSector) {
        diversified.push(c);
      }
      if (diversified.length >= 30) break;
    }

    // 不足15只则放宽
    if (diversified.length < 15) {
      for (const c of scoredCandidates) {
        if (!diversified.find(d => d.code === c.code)) {
          diversified.push(c);
        }
        if (diversified.length >= 20) break;
      }
    }

    this.results = diversified.slice(0, 30);

    // 渲染结果
    const totalFiltered = riskStats.ST + riskStats.limitUp + riskStats.limitDown + riskStats.abnormalTurnover + riskStats.lowPrice;
    infoEl.innerHTML = `全市场 <b>${marketRanking.length}</b> 只 → 风控过滤 <b style="color:#ff6b81">${totalFiltered}</b> 只 → 预评取前80 → 五维精评 → 行业分散 → 精选 <b style="color:#00d4ff">${this.results.length}</b> 只`;
    
    if (this.results.length === 0) {
      container.innerHTML = '<div class="empty-tip">当前无符合条件的股票，市场风险较高</div>';
      return;
    }

    // 风控过滤摘要
    const riskParts = [];
    if (riskStats.ST > 0) riskParts.push('ST(' + riskStats.ST + ')');
    if (riskStats.limitUp > 0) riskParts.push('涨停(' + riskStats.limitUp + ')');
    if (riskStats.limitDown > 0) riskParts.push('跌停(' + riskStats.limitDown + ')');
    if (riskStats.abnormalTurnover > 0) riskParts.push('异常换手(' + riskStats.abnormalTurnover + ')');
    if (riskStats.lowPrice > 0) riskParts.push('低价股(' + riskStats.lowPrice + ')');
    let riskSummaryHtml = '';
    if (riskParts.length > 0) {
      riskSummaryHtml = '<div style="background:rgba(255,71,87,0.1);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#ff6b81">' +
        '⚠️ 已自动过滤 ' + totalFiltered + ' 只风险股：' + riskParts.join('、') +
        '</div>';
    }

    container.innerHTML = riskSummaryHtml + this.results.map((s, i) => {
      const tagsHtml = s.tags.slice(0, 3).map(t => '<span class="sc-tag">' + t + '</span>').join('');
      const scoreColor = Utils.scoreColor(s.fiveDimScore);
      const opAdvice = Watchlist.getAdvice(s.fiveDimScore);
      const opBg = s.fiveDimScore >= 70 ? 'rgba(0,200,83,0.15)' : s.fiveDimScore >= 40 ? 'rgba(255,165,0,0.15)' : 'rgba(255,71,87,0.15)';
      const opColor = s.fiveDimScore >= 70 ? '#00c853' : s.fiveDimScore >= 40 ? '#ffa500' : '#ff4757';
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
            <div class="sc-metric-val" style="color:${scoreColor}">${s.fiveDimScore}<span style="font-size:9px;margin-left:2px">${Utils.scoreLevel(s.fiveDimScore)}</span></div>
            <div class="sc-metric-label">量化分</div>
          </div>
          <div class="sc-metric">
            <div class="sc-metric-val" style="color:${opColor};font-size:11px">${opAdvice.icon}${opAdvice.text}</div>
            <div class="sc-metric-label">操作分</div>
          </div>
        </div>
        <div class="sc-score">
          <div class="sc-score-label">综合</div>
          <div class="sc-score-val" style="color:${scoreColor}">${s.score}</div>
          <div class="sc-score-stars">${Utils.scoreLevel(s.fiveDimScore)}</div>
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

  /** 批量导入：解析粘贴文本，返回 {codes, invalid} */
  batchParse(text) {
    if (!text) return { codes: [], invalid: [] };
    const tokens = text
      .replace(/[（）()]/g, ' ')   // 去掉括号（港股标注等）
      .replace(/(?<![\d.])(\d{4,5})[ \t]*[\.\u00b7]?[ \t]*[Hh][Kk](?![A-Za-z])/g, ' hk$1 ')  // 00981.HK / 09880.hk → hk00981（不跨行、数字前须为边界）
      .split(/[\s,;，；、\n\r\t.。:：]+/)
      .map(t => t.replace(/[\u200b\ufeff]/g, '').trim())
      .filter(Boolean);
    const codes = [];
    const seen = new Set(this.getList());
    const invalid = [];
    let lastNum = '';
    for (const tk of tokens) {
      // 港股 hkXXXXX 形式（含上一步转换的）
      let m = tk.match(/^hk(\d{4,5})$/i);
      if (m) {
        const code = 'hk' + m[1].padStart(5, '0');
        if (!seen.has(code)) { seen.add(code); codes.push(code); }
        lastNum = '';
        continue;
      }
      // 纯4-5位数字：港股代码（A股/ETF均为6位，不冲突）
      if (/^\d{4,5}$/.test(tk)) {
        const code = 'hk' + tk.padStart(5, '0');
        if (!seen.has(code)) { seen.add(code); codes.push(code); }
        lastNum = '';
        continue;
      }
      // A股/ETF：6位数字（可带sh/sz/bj前缀）
      m = tk.match(/^(?:sh|sz|bj)?(\d{6})$/i);
      if (m) {
        const code = Utils.normalizeCode(m[1]);
        if (code && !seen.has(code)) { seen.add(code); codes.push(code); }
        lastNum = '';
        continue;
      }
      // 名称片段里夹带的6位/5位数字（如"湘电股份：600416"冒号被吃后的情况兜底）
      m = tk.match(/(\d{6})/);
      if (m) {
        const code = Utils.normalizeCode(m[1]);
        if (code && !seen.has(code)) { seen.add(code); codes.push(code); }
        lastNum = '';
        continue;
      }
      // 纯中文/英文名称：查内置股票表
      const name = tk.replace(/^[*ＳＴST]+/, '').trim();
      if (name && /[\u4e00-\u9fa5a-zA-Z]/.test(tk)) {
        if (CODE_TO_NAME) {
          // 精确匹配
          let hit = Object.entries(CODE_TO_NAME).find(([n]) => n === tk || n === name || n.replace(/^[*ST]+/, '') === name);
          if (hit && !seen.has(hit[1])) { seen.add(hit[1]); codes.push(hit[1]); lastNum = ''; continue; }
          // 模糊包含匹配（如"每日互动"匹配"每日互动"）
          hit = Object.entries(CODE_TO_NAME).find(([n]) => n.includes(name) || name.includes(n.replace(/^[*ST]+/, '')));
          if (hit && hit[0].length >= 2 && name.length >= 2 && !seen.has(hit[1])) { seen.add(hit[1]); codes.push(hit[1]); lastNum = ''; continue; }
        }
        lastNum = tk;
        continue;
      }
      if (tk && !/^\d+$/.test(tk)) invalid.push(tk);
    }
    return { codes, invalid };
  },

  /** 批量导入入库（带行情校验），返回结果对象 */
  async batchImport(codes) {
    if (!codes || codes.length === 0) return { added: 0, dup: 0, failed: [], failedNames: [] };
    const list = this.getList();
    const existing = new Set(list);
    const fresh = codes.filter(c => !existing.has(c));
    const dupCount = codes.length - fresh.length;
    if (fresh.length === 0) return { added: 0, dup: dupCount, failed: [], failedNames: [] };

    // 行情校验：能拉到行情的才入库（防止无效代码）
    const quotes = await DataAPI.fetchQuotes(fresh);
    const okCodes = [];
    const failed = [];
    for (const c of fresh) {
      const q = quotes[c];
      if (q && (q.price > 0 || (q.name && q.name !== c))) {
        okCodes.push(c);
      } else {
        failed.push(c);
      }
    }
    // 名称映射（行情返回的名字记入 CODE_TO_NAME，方便展示）
    okCodes.forEach(c => {
      const q = quotes[c];
      if (q && q.name) CODE_TO_NAME[c] = q.name;
      this._saveAddedAt(c);
    });
    const merged = list.concat(okCodes);
    this.save(merged);
    App.setDirty(true);
    return {
      added: okCodes.length,
      dup: dupCount,
      failed,
      failedNames: failed.map(c => (quotes[c] && quotes[c].name) || CODE_TO_NAME[c] || c)
    };
  },

  /** 打开批量导入弹窗 */
  showBatchModal() {
    let mask = document.getElementById('batchModalMask');
    if (mask) mask.remove();
    mask = document.createElement('div');
    mask.id = 'batchModalMask';
    mask.className = 'batch-modal-mask';
    mask.innerHTML =
      '<div class="batch-modal-box">' +
        '<div class="batch-modal-title">📥 批量导入自选股</div>' +
        '<div class="batch-modal-tip">粘贴股票清单（支持「名称：代码」、纯代码、00981.HK 港股、ETF等格式，自动去重识别）：</div>' +
        '<textarea id="batchImportText" class="batch-modal-textarea" placeholder="例如：\n湘电股份：600416\n中芯国际（港股）：00981.HK\n科创创业50ETF：159783\n也可以直接粘贴整段文字，代码会自动识别"></textarea>' +
        '<div id="batchImportResult" class="batch-modal-result"></div>' +
        '<div class="batch-modal-btns">' +
          '<button class="batch-modal-btn cancel" onclick="Watchlist.closeBatchModal()">取消</button>' +
          '<button id="batchImportDoBtn" class="batch-modal-btn primary" onclick="Watchlist.doBatchImport()">开始导入</button>' +
        '</div>' +
      '</div>';
    mask.addEventListener('click', (e) => { if (e.target === mask) this.closeBatchModal(); });
    document.body.appendChild(mask);
    setTimeout(() => { const ta = document.getElementById('batchImportText'); if (ta) ta.focus(); }, 100);
  },

  closeBatchModal() {
    const mask = document.getElementById('batchModalMask');
    if (mask) mask.remove();
  },

  /** 执行批量导入（弹窗按钮） */
  async doBatchImport() {
    const ta = document.getElementById('batchImportText');
    const resultEl = document.getElementById('batchImportResult');
    const btn = document.getElementById('batchImportDoBtn');
    if (!ta) return;
    const { codes, invalid } = this.batchParse(ta.value);
    if (codes.length === 0) {
      if (resultEl) resultEl.innerHTML = '<span style="color:#ffa500">未识别到有效股票代码，请检查格式（如 600416 或 00981.HK）</span>';
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '导入中...'; }
    if (resultEl) resultEl.innerHTML = '<span style="color:#8ab4f8">识别到 ' + codes.length + ' 只，正在校验行情...</span>';
    const res = await this.batchImport(codes);
    if (btn) { btn.disabled = false; btn.textContent = '开始导入'; }
    let html = '<div style="line-height:1.9">';
    html += '<div style="color:#00c853;font-size:15px">✅ 成功导入 ' + res.added + ' 只</div>';
    if (res.dup > 0) html += '<div style="color:#8ab4f8">ℹ️ ' + res.dup + ' 只已在自选股中，自动跳过</div>';
    if (res.failed.length > 0) html += '<div style="color:#ff4757">⚠️ ' + res.failed.length + ' 只校验失败未入库：' + res.failedNames.join('、') + '</div>';
    if (invalid.length > 0) html += '<div style="color:#999;font-size:12px">未识别片段：' + invalid.slice(0, 5).join('、') + (invalid.length > 5 ? ' 等' : '') + '</div>';
    html += '</div>';
    if (resultEl) resultEl.innerHTML = html;
    Utils.toast('批量导入完成：新增' + res.added + '只');
    if (res.added > 0) {
      setTimeout(() => {
        this.closeBatchModal();
        if (Navigation.currentPage === 'watchlist') this.render();
        else App.switchPage('watchlist');
      }, 1200);
    }
  },

  /** URL参数静默导入：?import=sh600416,hk00981,... */
  async importFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('import');
      if (!raw) return;
      const codes = raw.split(',').map(c => Utils.normalizeCode(c.trim())).filter(Boolean);
      if (codes.length === 0) return;
      const res = await this.batchImport(codes);
      if (res.added > 0) {
        Utils.toast('已自动导入 ' + res.added + ' 只自选股');
        if (Navigation.currentPage === 'watchlist') this.render();
      }
      // 清掉URL参数，避免刷新重复导入
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    } catch (e) { console.warn('[importFromUrl]', e); }
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
// 11.5 NextDayPrediction - 次日上涨概率TOP20（盘后扫描+隔日核实）
// ============================================================
/**
 * 模型说明：
 * - 资金面35分：主力净流入占比/规模 + 放量程度（当日，东财clist实时字段）
 * - 趋势技术35分：MA多头/MACD/KDJ/RSI/BOLL位置（120日K线计算）
 * - 量价配合30分：换手活跃度 + 涨幅强度 + 收盘位置 + 20日超买超卖 + 回踩均线
 * 只标注概率等级，不预测涨幅；每只附2+条专属下跌风险。
 */
const NextDayPrediction = {
  STORAGE_KEY: 'zhigu_nextday_snapshots',
  MAX_SNAPSHOTS: 30,
  scanning: false,

  // ---------- 存储 ----------
  _loadSnapshots() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || []; }
    catch (e) { return []; }
  },
  _saveSnapshots(list) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list.slice(0, this.MAX_SNAPSHOTS))); }
    catch (e) { console.warn('快照保存失败（存储空间不足）', e); }
  },
  _todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _boardTag(code) {
    const raw = code.replace(/^(sh|sz|bj)/, '');
    if (code.startsWith('bj') || raw.startsWith('8') || raw.startsWith('4') || raw.startsWith('92')) return '北交所';
    if (raw.startsWith('688')) return '科创板';
    if (raw.startsWith('30')) return '创业板';
    return '主板';
  },

  // ---------- 入口：扫描 ----------
  async scan() {
    if (this.scanning) return;
    this.scanning = true;
    const body = document.getElementById('nextDayBody');
    const setStatus = (t) => { body.innerHTML = '<div class="loading-pulse">' + t + '</div>'; };

    try {
      setStatus('第1步/4：拉取全市场成交额前200只活跃股...');
      const stocks = await DataAPI.fetchTopMarketStocks(200);
      if (!stocks || stocks.length === 0) {
        body.innerHTML = '<div class="empty-tip">全市场数据获取失败（网络问题或数据源暂时不可用），请稍后重试。</div>';
        return;
      }

      // 预筛：资金面+当日量价（clist字段直接算）
      setStatus('第2步/4：资金面与量价初筛（' + stocks.length + '只）...');
      const scored = [];
      for (const s of stocks) {
        const pre = this._preScore(s);
        if (pre === null) continue; // 排除：ST/一字板/停牌/主力大幅流出
        scored.push(Object.assign({}, s, { preScore: pre.score, risks: pre.risks, mainPct: pre.mainPct }));
      }
      // 取预筛前60名进入K线技术打分
      scored.sort((a, b) => b.preScore - a.preScore);
      const candidates = scored.slice(0, 60);

      setStatus('第3步/4：逐只计算趋势技术因子（K线，共' + candidates.length + '只）...');
      const batchSize = 8;
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        await Promise.all(batch.map(async (s) => {
          try {
            const klines = await DataAPI.fetchKline(s.code, 120);
            const tech = this._techScore(klines);
            s.techScore = tech.score;
            s.techRisks = tech.risks;
            s.klineOk = klines && klines.length >= 30;
          } catch (e) {
            s.techScore = 0; s.techRisks = []; s.klineOk = false;
          }
        }));
        setStatus('第3步/4：技术因子计算中 ' + Math.min(i + batchSize, candidates.length) + '/' + candidates.length);
      }

      setStatus('第4步/4：综合排名并保存快照...');
      const finalList = candidates
        .filter(s => s.klineOk)
        .map(s => {
          const total = s.preScore + (s.techScore || 0);
          const risks = this._mergeRisks(s.risks, s.techRisks, s);
          return {
            code: s.code, name: s.name, board: this._boardTag(s.code),
            price: s.price, changePct: s.changePct, turnover: s.turnover,
            mainFlow: s.mainFlow, mainPct: s.mainPct,
            score: total, preScore: s.preScore, techScore: s.techScore || 0,
            level: this._level(total),
            risks: risks,
            verified: null, nextChangePct: null
          };
        })
        .filter(x => x.score >= 45)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      if (finalList.length === 0) {
        body.innerHTML = '<div class="empty-tip">今日全市场无符合条件的高概率标的（资金面与技术面共振个股不足），这本身是偏弱信号，建议控制仓位观望。</div>';
        return;
      }

      // 保存快照（同日重复扫描则覆盖当日快照）
      const snapshot = {
        date: this._todayStr(),
        ts: Date.now(),
        stocks: finalList
      };
      const snaps = this._loadSnapshots().filter(x => x.date !== snapshot.date);
      snaps.unshift(snapshot);
      this._saveSnapshots(snaps);

      this._renderList(snapshot);
      Utils.toast ? Utils.toast('已保存 ' + this._todayStr() + ' 排名，次日可点「核实昨日排名」验证') : null;
    } catch (e) {
      console.error('NextDayPrediction.scan error:', e);
      body.innerHTML = '<div class="empty-tip">扫描失败：' + (e.message || e) + '，请稍后重试。</div>';
    } finally {
      this.scanning = false;
    }
  },

  // ---------- 预筛打分（当日资金面+量价，满分40） ----------
  _preScore(s) {
    const risks = [];
    if (!s.name || s.name.includes('ST') || s.name.includes('退')) return null;
    if (!(s.price > 0)) return null;
    // 一字涨停/一字跌停：振幅<0.5%且涨跌停，无上车机会或风险大，排除
    const amp = s.amplitude || 0;
    if (amp < 0.5 && Math.abs(s.changePct) > 9) return null;

    let score = 0;
    const amount = s.amount || 0;           // 成交额（元）
    const mainFlow = s.mainFlow || 0;       // 主力净流入（元）
    const mainPct = amount > 0 ? mainFlow / amount * 100 : 0;

    // A1 主力净占比（15分）
    if (mainPct >= 15) score += 15;
    else if (mainPct >= 10) score += 12;
    else if (mainPct >= 6) score += 9;
    else if (mainPct >= 3) score += 5;
    else if (mainPct >= 0) score += 2;
    else { score += 0; risks.push('主力资金今日净流出，占比' + mainPct.toFixed(1) + '%，机构在撤而非在进'); }
    if (mainPct < -5) return null; // 主力大幅流出直接淘汰

    // A2 主力净流入规模（10分）
    if (mainFlow >= 3e8) score += 10;
    else if (mainFlow >= 1.5e8) score += 8;
    else if (mainFlow >= 7e7) score += 6;
    else if (mainFlow >= 3e7) score += 4;
    else if (mainFlow >= 1e7) score += 2;

    // A3 涨幅强度（8分）——温和上涨最优，涨停过热减分
    const cp = s.changePct || 0;
    if (cp >= 2 && cp < 6) score += 8;
    else if (cp >= 1 && cp < 2) score += 6;
    else if (cp >= 6 && cp < 9.5) { score += 4; risks.push('今日涨幅' + cp.toFixed(1) + '%偏大，短线获利盘堆积，次日高开易遭兑现'); }
    else if (cp >= 9.5) { score += 2; risks.push('今日涨停，次日溢价不确定性高，炸板或低开风险大'); }
    else if (cp >= 0 && cp < 1) score += 3;
    else { return null; } // 当日下跌的不进次日上涨候选

    // A4 换手活跃度（7分）
    const to = s.turnover || 0;
    if (to >= 3 && to < 10) score += 7;
    else if (to >= 10 && to < 18) { score += 5; risks.push('换手率' + to.toFixed(1) + '%偏高，筹码松动，分歧加大'); }
    else if (to >= 18) { score += 3; risks.push('换手率高达' + to.toFixed(1) + '%，疑似游资接力博弈，次日接力资金断档风险'); }
    else if (to >= 1.5 && to < 3) score += 5;
    else if (to >= 0.5) score += 2;
    else risks.push('换手率仅' + to.toFixed(2) + '%，交投清淡，缺乏资金关注');

    return { score, risks, mainPct };
  },

  // ---------- 技术打分（120日K线，满分60） ----------
  _techScore(klines) {
    const risks = [];
    if (!klines || klines.length < 30) return { score: 0, risks: ['K线数据不足，技术形态无法确认'] };
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const n = closes.length;
    const last = closes[n - 1];
    let score = 0;

    // B1 MA均线多头排列（12分）
    const ma5 = Utils.calcMASeries(closes, 5);
    const ma10 = Utils.calcMASeries(closes, 10);
    const ma20 = Utils.calcMASeries(closes, 20);
    const ma60 = Utils.calcMASeries(closes, 60);
    const v5 = ma5[n - 1], v10 = ma10[n - 1], v20 = ma20[n - 1], v60 = ma60[n - 1];
    if (v5 && v10 && v20) {
      if (v5 > v10 && v10 > v20 && last > v5) score += 7;
      else if (v5 > v10 && last > v5) score += 5;
      else if (last > v20) score += 3;
      else if (last < v20) risks.push('股价收在20日均线下方，中期趋势偏弱');
      if (v60 && v20 > v60) score += 5;
      else if (v60 && v20 < v60) risks.push('20日线在60日线下方，中期趋势仍受压制');
      else score += 2;
    }

    // B2 MACD（8分）
    const macd = Utils.calcMACDSeries(closes);
    const dif = macd.dif[n - 1], dea = macd.dea[n - 1], mBar = macd.macd[n - 1];
    const difPrev = macd.dif[n - 2], deaPrev = macd.dea[n - 2];
    if (dif != null && dea != null) {
      if (dif > dea && dif > 0) score += 5;
      else if (dif > dea) score += 3;
      if (difPrev != null && deaPrev != null && difPrev <= deaPrev && dif > dea) score += 3; // 金叉
      if (mBar < 0 && dif < 0) risks.push('MACD处于零轴下方绿柱区，空头动能未释放完');
    }

    // B3 KDJ（6分）
    const kdj = Utils.calcKDJSeries(closes, highs, lows);
    const k = kdj.k[n - 1], d = kdj.d[n - 1], j = kdj.j[n - 1];
    if (k != null) {
      if (k > d && k < 80) score += 4;
      else if (k > d) score += 2;
      if (j > 100) risks.push('KDJ的J值' + j.toFixed(0) + '超买，短线技术性回调概率上升');
      else if (k < 30) score += 2; // 低位金叉潜力
    }

    // B4 RSI（4分）
    const rsi6 = Utils.calcRSISeries(closes, 6)[n - 1];
    const rsi14 = Utils.calcRSISeries(closes, 14)[n - 1];
    if (rsi6 != null) {
      if (rsi6 >= 50 && rsi6 < 80) score += 2;
      if (rsi14 != null && rsi14 >= 45 && rsi14 < 70) score += 2;
      if (rsi6 >= 85) risks.push('6日RSI达' + rsi6.toFixed(0) + '进入超买区，追高风险大');
    }

    // B5 BOLL位置（5分）
    const boll = Utils.calcBOLLSeries(closes);
    const up = boll.upper[n - 1], mid = boll.mid[n - 1], lowB = boll.lower[n - 1];
    if (up != null) {
      if (last > mid && last < up) score += 5;
      else if (last >= up) { score += 2; risks.push('股价触及布林上轨，短线超涨，回归中轨压力大'); }
      else if (last < mid && last > lowB) score += 2;
      else if (last <= lowB) risks.push('股价跌破布林下轨，弱势格局未改');
    }

    return { score, risks };
  },

  // ---------- 风险合并（保证≥2条） ----------
  _mergeRisks(preRisks, techRisks, s) {
    const all = [];
    (preRisks || []).forEach(r => { if (!all.includes(r)) all.push(r); });
    (techRisks || []).forEach(r => { if (!all.includes(r)) all.push(r); });
    if (all.length < 2) {
      all.push('大盘系统性风险：若次日指数低开或板块轮动退潮，个股难独善其身');
      if (all.length < 2) all.push('本排名为短线概率参考，突发利空/业绩/减持公告可能直接改变走势');
    }
    return all.slice(0, 4);
  },

  _level(score) {
    if (score >= 80) return { label: '高概率', color: '#ff5252' };
    if (score >= 65) return { label: '较高概率', color: '#ff9800' };
    if (score >= 50) return { label: '中等概率', color: '#00d4ff' };
    return { label: '概率偏低', color: '#8a8e9b' };
  },

  // ---------- 渲染 ----------
  _renderList(snapshot) {
    const body = document.getElementById('nextDayBody');
    const verifyBadge = snapshot.verified != null
      ? (snapshot.verified
        ? '<span style="color:#00e676;font-size:12px">✅ 已核实：' + snapshot.hitCount + '/' + snapshot.stocks.length + ' 只次日收涨（胜率' + snapshot.winRate + '%）</span>'
        : '<span style="color:#8a8e9b;font-size:12px">⏳ 次日尚未开盘/数据未更新，开盘后可核实</span>')
      : '';
    let html = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">📅 数据基准日：' + snapshot.date + '（盘后） · 共' + snapshot.stocks.length + '只 ' + verifyBadge + '</div>';
    html += '<div class="hot-stocks-list">';
    snapshot.stocks.forEach((s, idx) => {
      const rankCls = idx < 3 ? 'rank-top3' : 'rank-normal';
      const chgCls = s.verified === true ? (s.nextChangePct >= 0 ? 'up' : 'down') : '';
      const chgColor = s.verified === true ? (s.nextChangePct >= 0 ? '#00e676' : '#ff5252') : (s.changePct >= 0 ? '#00e676' : '#ff5252');
      const verify = s.verified === true
        ? '<div style="font-size:11px;color:' + (s.nextChangePct >= 0 ? '#00e676' : '#ff5252') + '">次日实际：' + (s.nextChangePct >= 0 ? '+' : '') + s.nextChangePct.toFixed(2) + '%</div>'
        : '';
      html += '<div class="hot-stock-item st-card" onclick="App.analyzeStock(\'' + s.code + '\')">'
        + '<div class="rank ' + rankCls + '">' + (idx + 1) + '</div>'
        + '<div class="hs-info">'
        +   '<div class="hs-name">' + s.name + ' <span style="font-size:10px;color:var(--text-muted);font-weight:400">[' + s.board + ']</span></div>'
        +   '<div class="hs-code">' + s.code.replace(/^(sh|sz|bj)/, '').toUpperCase() + ' · 换手' + (s.turnover || 0).toFixed(1) + '% · 主力' + (s.mainFlow >= 0 ? '净流入' : '净流出') + Utils.formatAmount(Math.abs(s.mainFlow || 0)) + '</div>'
        +   verify
        + '</div>'
        + '<div class="hs-price">'
        +   '<div class="hs-price-val" style="color:' + chgColor + '">' + (s.changePct >= 0 ? '+' : '') + s.changePct.toFixed(2) + '%</div>'
        +   '<div class="hs-change-val" style="color:' + s.level.color + ';font-weight:600">' + s.level.label + '</div>'
        + '</div>'
        + '<div class="hs-score">'
        +   '<div class="hs-score-val" style="color:' + s.level.color + '">' + s.score + '</div>'
        +   '<div class="hs-score-label">概率分</div>'
        + '</div>'
        + '</div>';
      // 风险提示（展开区）
      html += '<div style="padding:0 0 10px 38px;font-size:11px;line-height:1.6;color:#ffab91;border-bottom:1px solid var(--border-color)">'
        + '⚠️ 下跌风险：' + s.risks.slice(0, 2).join('；') + '</div>';
    });
    html += '</div>';
    html += '<div style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.6">点击个股可进入详细分析。排名仅为基于公开数据的短线概率统计，不构成投资建议；不预测具体涨幅。历史快照保存在本机，最多留存30个交易日。</div>';
    body.innerHTML = html;
  },

  // ---------- 页面加载时渲染最新快照 ----------
  renderLatest() {
    const body = document.getElementById('nextDayBody');
    if (!body) return;
    const snaps = this._loadSnapshots();
    if (snaps.length === 0) return; // 保留HTML中的默认提示
    this._renderList(snaps[0]);
  },

  // ---------- 隔日核实 ----------
  async verifyAll() {
    const snaps = this._loadSnapshots();
    if (snaps.length === 0) {
      Utils.toast ? Utils.toast('还没有保存过排名，请先扫描生成') : null;
      return;
    }
    const body = document.getElementById('nextDayBody');
    body.innerHTML = '<div class="loading-pulse">正在拉取最新行情核实昨日排名...</div>';

    // 找到最近一个未核实且基准日早于今天的快照
    const today = this._todayStr();
    let target = snaps.find(x => x.verified !== true && x.date < today);
    if (!target) {
      // 全部已核实，展示最新一个
      this._renderList(snaps[0]);
      Utils.toast ? Utils.toast('暂无待核实的排名（今日快照需等下一交易日）') : null;
      return;
    }

    let hit = 0, resolved = 0;
    const batchSize = 10;
    const list = target.stocks;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      await Promise.all(batch.map(async (s) => {
        try {
          const klines = await DataAPI.fetchKline(s.code, 5);
          if (klines && klines.length > 0) {
            const next = klines.find(k => k.date > target.date);
            if (next) {
              // 找基准日收盘价
              const base = klines.filter(k => k.date <= target.date).pop();
              if (base) {
                s.nextChangePct = (next.close - base.close) / base.close * 100;
                s.verified = true;
                resolved++;
                if (s.nextChangePct > 0) hit++;
              }
            }
          }
        } catch (e) { /* 单只失败不影响整体 */ }
      }));
    }

    if (resolved === 0) {
      body.innerHTML = '<div class="empty-tip">次日行情尚未更新（非交易时间或数据延迟），请在交易时段或收盘后再核实。<br><br>最近一次排名基准日：' + target.date + '</div>';
      return;
    }

    target.verified = true;
    target.hitCount = hit;
    target.resolvedCount = resolved;
    target.winRate = Math.round(hit / resolved * 100);
    target.verifyDate = this._todayStr();
    this._saveSnapshots(snaps);
    this._renderList(target);
    Utils.toast ? Utils.toast('核实完成：' + hit + '/' + resolved + ' 只次日收涨，胜率' + target.winRate + '%') : null;
  }
};

// ============================================================
// 12. App - 主入口
// ============================================================
const App = {
  currentStock: null,
  klineChart: null,
  techChart: null,
  sevenDimChart: null,
  _klineData: null,    // 当前K线原始数据（用于切换指标重绘）
  _klineQuote: null,   // 当前行情
  _klineOverlay: 'ma', // K线主图叠加：ma / boll / none
  _klineCount: 60,     // K线加载根数

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

    // 定时刷新（5分钟）
    setInterval(() => {
      if (Navigation.currentPage === 'home') {
        this.loadHotStocks();
      }
      if (Navigation.currentPage === 'watchlist') {
        Watchlist.render();
      }
    }, 300000);

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

  /** 注册Service Worker（便携版/非http协议下跳过） */
  registerSW() {
    if (window.__PORTABLE__) return; // 单文件便携版不注册SW
    if (location.protocol === 'file:') return;
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
    if (pageName === 'analysis') {
      NextDayPrediction.renderLatest();
    }
  },

  /** 加载短线潜力TOP10（板块热度+主力资金+量价技术）
   *  多数据源多级降级：行业板块 → 概念板块 → 全市场活跃股 → 腾讯静态热门 */
  async loadHotStocks() {
    const container = document.getElementById('hotStocks');
    container.innerHTML = '<div class="loading-pulse">正在扫描热门板块与主力资金...</div>';

    let hotSectors = [];
    let candidates = [];
    let fallbackMode = 'normal';  // normal / concept / market / static

    try {
      // ====== 第1步：多源获取板块数据（带降级）======
      // 源1：行业板块
      let sectors = await DataAPI.fetchSectorRank(10).catch(e => { console.warn('行业板块失败', e); return []; });
      if (sectors.length > 0) {
        hotSectors = sectors.filter(s => s.changePct > 0 || s.mainFlow > 0).slice(0, 8);
      }
      // 源2：概念板块（行业板块失败时降级）
      if (hotSectors.length === 0) {
        console.warn('[短线TOP10] 行业板块为空，降级到概念板块');
        const concepts = await DataAPI.fetchConceptSectors(12).catch(e => { console.warn('概念板块失败', e); return []; });
        if (concepts.length > 0) {
          hotSectors = concepts.filter(s => s.changePct > 0 || s.mainFlow > 0).slice(0, 8);
          fallbackMode = 'concept';
        }
      }
      // 源3：全市场活跃股（概念板块也失败时的最终降级）
      if (hotSectors.length === 0) {
        console.warn('[短线TOP10] 板块接口全部失败，降级到全市场活跃股');
        const topStocks = await DataAPI.fetchTopMarketStocks(100).catch(e => { console.warn('全市场排行失败', e); return []; });
        if (topStocks.length > 0) {
          // 用本地SECTORS映射给每只股票补板块信息
          const stockSectorMap = {};  // sectorName -> {name, changePct, mainFlow, upCount, downCount}
          for (const st of topStocks) {
            const sectorInfo = CONFIG.SECTORS[st.code];
            const sectorName = sectorInfo ? sectorInfo.name : '全市场活跃';
            st.sectorName = sectorName;
            st.sectorCode = 'fallback_' + sectorName;
            if (!stockSectorMap[sectorName]) {
              stockSectorMap[sectorName] = {
                name: sectorName, changePct: st.changePct || 0,
                mainFlow: st.mainFlow || 0, upCount: 0, downCount: 0
              };
            } else {
              stockSectorMap[sectorName].upCount++;
            }
          }
          hotSectors = Object.values(stockSectorMap)
            .sort((a, b) => (b.mainFlow || 0) - (a.mainFlow || 0))
            .slice(0, 8);
          candidates = topStocks.slice(0, 40);
          fallbackMode = 'market';
        }
      }

      // 源4：腾讯静态热门（所有API都失败时的最后保底）
      if (hotSectors.length === 0) {
        console.warn('[短线TOP10] 所有接口失败，最终降级到静态热门池');
        const quotes = await DataAPI.fetchQuotes(CONFIG.HOT_STOCKS).catch(e => []);
        const arr = [];
        for (const [code, q] of Object.entries(quotes || {})) {
          if (!q.price || q.price <= 0) continue;
          const sectorInfo = CONFIG.SECTORS[code];
          arr.push({
            code, name: q.name, price: q.price,
            changePct: q.changePct || 0,
            volume: q.volume || 0,
            amount: q.amount || 0,
            amplitude: Math.abs(q.changePct || 0) * 1.2,
            turnover: q.turnover || 0,
            pe: q.pe || 0,
            mainFlow: 0,
            pb: q.pb || 0,
            marketCap: q.marketCap || 0,
            sectorName: sectorInfo ? sectorInfo.name : '热门蓝筹',
            sectorCode: 'static',
          });
        }
        candidates = arr;
        hotSectors = [{ name: '热门蓝筹', changePct: 0, mainFlow: 0, upCount: 0, downCount: 0 }];
        fallbackMode = 'static';
      }

      // ====== 第2步：从板块获取成分股（仅 normal/concept 模式）======
      const sectorInfoMap = {};  // 保存板块完整信息用于评分
      if (fallbackMode === 'normal' || fallbackMode === 'concept') {
        const sectorStockMap = {};
        const stockMap = {};
        for (const sec of hotSectors) {
          sectorInfoMap[sec.code] = sec;  // 保存板块对象
          const stocks = await DataAPI.fetchSectorStocks(sec.code, 8).catch(e => {
            console.warn('板块', sec.name, '成分股失败', e); return [];
          });
          if (stocks.length > 0) {
            sectorStockMap[sec.code] = { sector: sec, stocks };
            for (const st of stocks) {
              if (!stockMap[st.code]) {
                stockMap[st.code] = { ...st, sectorCode: sec.code, sectorName: sec.name };
              }
            }
          }
        }
        candidates = Object.values(stockMap);

        // 板块成分股全部失败时，再降级到全市场活跃股
        if (candidates.length === 0) {
          console.warn('[短线TOP10] 板块成分股全部失败，降级到全市场活跃股');
          const topStocks = await DataAPI.fetchTopMarketStocks(100).catch(e => []);
          if (topStocks.length > 0) {
            candidates = topStocks.map(st => {
              const sectorInfo = CONFIG.SECTORS[st.code];
              return {
                ...st,
                sectorName: sectorInfo ? sectorInfo.name : '全市场活跃',
                sectorCode: 'market_fallback'
              };
            });
            fallbackMode = 'market';
            hotSectors = [{ name: '全市场活跃', changePct: 0, mainFlow: 0, upCount: 0, downCount: 0 }];
          }
        }
      }

      if (candidates.length === 0) {
        container.innerHTML = `
          <div class="empty-tip">
            未获取到行情数据，可能网络或数据源异常<br>
            <button class="st-retry-btn" onclick="App.loadHotStocks()">🔄 点击重试</button>
          </div>`;
        return;
      }

      // ====== 第3步：拉K线+资金流+新闻，计算四维评分 ======
      const klinePromises = candidates.map(c => DataAPI.fetchKline(c.code, 60).catch(() => null));
      const flowPromises = candidates.map(c => DataAPI.fetchCapitalFlowStock(c.code, 3).catch(() => null));
      const newsPromises = candidates.map(c => DataAPI.fetchNews(c.code).catch(() => []));
      const [klinesArr, flowsArr, newsArr] = await Promise.all([
        Promise.all(klinePromises), Promise.all(flowPromises), Promise.all(newsPromises)
      ]);

      const scored = [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const klines = klinesArr[i];
        const flowData = flowsArr[i];
        const news = newsArr[i] || [];
        // 构造板块信息用于评分（优先用真实板块，降级模式构造虚拟板块）
        let sector = sectorInfoMap[c.sectorCode] || null;
        if (!sector) {
          sector = {
            name: c.sectorName || '全市场',
            changePct: c.changePct || 0,
            mainFlow: c.mainFlow || 0,
            upCount: 10,
            downCount: 5,
          };
        }
        const capitalScore = this._scoreCapitalMovement(c, flowData);
        const sectorScore = this._scoreSectorTrend(sector, klines);
        const policyScore = this._scorePolicyImpact(news);
        const newsScore = this._scoreCompanyNews(news, c);
        // 筹码结构 + 压力位分析
        const chip = Utils.calcChipDistribution(klines, c.price);
        const sr = Utils.calcSupportResistance(klines, c.price);
        // 筹码调整因子（-8 ~ +8）：获利盘适中+集中度高+有上涨空间加分；高位获利盘过多/上方重压扣分
        let chipAdj = 0;
        if (chip.profitRatio >= 50 && chip.profitRatio <= 80) chipAdj += 4;          // 获利盘适中，健康
        else if (chip.profitRatio > 90) chipAdj -= 6;                               // 获利盘过多，抛压风险
        else if (chip.profitRatio < 20) chipAdj -= 3;                               // 套牢盘过多，上行阻力大
        if (chip.concentration > 0 && chip.concentration < 15) chipAdj += 3;         // 筹码集中，主力控盘
        else if (chip.concentration > 30) chipAdj -= 2;                             // 筹码分散
        if (chip.pressureDistance >= 5 && chip.pressureDistance <= 15) chipAdj += 3; // 距上方筹码压力有合理空间
        else if (chip.pressureDistance > 0 && chip.pressureDistance < 2) chipAdj -= 4; // 紧贴压力位
        if (sr.resistance > c.price) {
          const distSR = (sr.resistance - c.price) / c.price * 100;
          if (distSR >= 3 && distSR <= 12) chipAdj += 2;
          else if (distSR < 1.5) chipAdj -= 3;
        }
        const rawTotal = capitalScore * 0.30 + sectorScore * 0.25 + policyScore * 0.25 + newsScore * 0.20;
        const total = Math.max(0, Math.min(100, Math.round(rawTotal + chipAdj)));

        let probTag = '观望';
        if (total >= 85) probTag = '强势';
        else if (total >= 75) probTag = '偏强';
        else if (total >= 60) probTag = '中性偏强';
        else if (total >= 45) probTag = '中性';

        let category = '波段';
        if (c.turnover >= 5 && c.amplitude >= 4 && total >= 65) category = '日内';
        else if (klines && klines.length >= 10) {
          const last3 = klines.slice(-3);
          let cum3 = 0;
          for (let j = 1; j < last3.length; j++) {
            cum3 += (last3[j].close - last3[j-1].close) / last3[j-1].close * 100;
          }
          if (cum3 > 6) category = '波段';
        }

        const risks = this._getShortTermRisks(c, klines, flowData, chip, sr);
        const logic = this._getShortTermLogic(c, sector, flowData, klines, capitalScore, sectorScore, policyScore, newsScore, news, chip, sr);

        // 计算五维量化分和操作分
        const fiveDim = Utils.fiveDimScore(c, klines);
        const quantScore = fiveDim.total;
        const opAdvice = Watchlist.getAdvice(quantScore);

        scored.push({
          code: c.code, name: c.name, price: c.price, changePct: c.changePct,
          sectorName: c.sectorName || '全市场',
          turnover: c.turnover, amount: c.amount, pe: c.pe, marketCap: c.marketCap,
          total, capitalScore, sectorScore, policyScore, newsScore,
          chip, sr,
          probTag, category, risks, logic,
          quantScore, opAdvice
        });
      }

      // ====== 第4步：排序取TOP20并渲染 ======
      scored.sort((a, b) => b.total - a.total);
      const top20 = scored.slice(0, 20);
      this._shortTermAll = top20;            // 保存全量供排序切换
      this._shortTermSortKey = 'composite';  // 默认综合排序
      this._shortTermCtx = { topSectors: hotSectors.slice(0, 5), fallbackMode };
      this.renderShortTermTop10(top20, this._shortTermCtx.topSectors, this._shortTermCtx.fallbackMode);
    } catch (e) {
      console.error('[短线TOP10] 整体异常:', e);
      container.innerHTML = `
        <div class="empty-tip">
          加载异常：${e.message || '未知错误'}<br>
          <button class="st-retry-btn" onclick="App.loadHotStocks()">🔄 点击重试</button>
        </div>`;
    }
  },

  /** 主力动向评分（0-100）：权重30% — 今日主力净流入+连续流入+大单占比+加速流入 */
  _scoreCapitalMovement(stock, flowData) {
    let s = 35;
    const amt = (stock && stock.amount) || 1;
    const flows = (flowData && flowData.flows) || [];
    const today = flowData && flowData.today;

    // 1) 今日主力净流入金额/占比（最重要）
    const todayMain = (today && today.main) || 0;
    const todayRatio = todayMain / amt;
    if (todayRatio > 0.15) s += 25;
    else if (todayRatio > 0.10) s += 20;
    else if (todayRatio > 0.05) s += 15;
    else if (todayRatio > 0.02) s += 10;
    else if (todayRatio > 0) s += 5;
    else if (todayRatio > -0.05) s -= 5;
    else if (todayRatio > -0.10) s -= 12;
    else s -= 20;

    // 2) 连续净流入天数加分
    if (flows.length >= 2) {
      let contDays = 0;
      for (let i = flows.length - 1; i >= 0; i--) {
        if (flows[i].main > 0) contDays++;
        else break;
      }
      if (contDays >= 3) s += 15;
      else if (contDays === 2) s += 10;
      else if (contDays === 1) s += 3;
      else s -= 5; // 连续流出
    }

    // 3) 超大单+大单占比（主力强度）
    if (today) {
      const superBig = today.superBig || 0;
      const big = today.big || 0;
      const bigTotal = superBig + big;
      const bigRatio = amt > 0 ? bigTotal / amt : 0;
      if (bigRatio > 0.12) s += 12;
      else if (bigRatio > 0.08) s += 8;
      else if (bigRatio > 0.04) s += 4;
      else if (bigRatio < -0.08) s -= 8;
    }

    // 4) 资金流入加速（今日>昨日>前日）加分
    if (flows.length >= 3) {
      const d0 = flows[flows.length - 1].main;
      const d1 = flows[flows.length - 2].main;
      const d2 = flows[flows.length - 3].main;
      if (d0 > d1 && d1 > d2 && d0 > 0) s += 10;
      else if (d0 > d1 && d0 > 0) s += 5;
      else if (d0 < d1 && d1 < d2 && d0 < 0) s -= 8;
    }

    return Math.max(0, Math.min(100, Math.round(s)));
  },

  /** 板块趋势评分（0-100）：权重25% — 板块涨幅+资金+涨家数占比+个股共振 */
  _scoreSectorTrend(sector, klines) {
    if (!sector) return 35;
    let s = 40;
    const chg = sector.changePct || 0;

    // 1) 板块当日涨跌幅（温和上涨1-3%最佳，暴涨防回调）
    if (chg >= 1 && chg <= 3) s += 20;          // 温和上涨最佳
    else if (chg > 3 && chg <= 5) s += 15;      // 偏强
    else if (chg > 5) s += 8;                   // 暴涨扣分防回调
    else if (chg >= 0.3 && chg < 1) s += 10;    // 小涨
    else if (chg >= 0 && chg < 0.3) s += 4;     // 平盘偏强
    else if (chg >= -1) s -= 5;                 // 小跌
    else if (chg >= -3) s -= 12;                // 偏弱
    else s -= 20;                               // 大跌

    // 2) 板块主力净流入
    const flow = sector.mainFlow || 0;
    if (flow > 5e9) s += 15;        // 50亿+
    else if (flow > 2e9) s += 10;   // 20亿+
    else if (flow > 5e8) s += 6;    // 5亿+
    else if (flow > 0) s += 2;
    else if (flow < -5e8) s -= 8;
    else if (flow < -2e9) s -= 12;

    // 3) 板块上涨家数占比
    const up = sector.upCount || 0;
    const down = sector.downCount || 0;
    const total = up + down;
    if (total > 0) {
      const upRatio = up / total;
      if (upRatio >= 0.8) s += 15;
      else if (upRatio >= 0.65) s += 10;
      else if (upRatio >= 0.5) s += 5;
      else if (upRatio < 0.3) s -= 8;
    }

    // 4) 个股K线与板块共振（板块上涨+个股也上涨=共振加分）
    if (klines && klines.length >= 2) {
      const last = klines[klines.length - 1];
      const prev = klines[klines.length - 2];
      const stockChg = (last.close - prev.close) / prev.close * 100;
      if (chg > 0 && stockChg > 0) {
        // 共振上涨
        if (stockChg <= chg * 1.2 && stockChg >= chg * 0.5) s += 8;  // 跟涨
        else if (stockChg > chg * 1.2) s += 5;                       // 强于板块
      } else if (chg > 0 && stockChg < 0) {
        s -= 4;  // 板块涨个股跌，背离
      } else if (chg < 0 && stockChg > 0) {
        s += 6;  // 逆势上涨，独立行情
      }
    }

    return Math.max(0, Math.min(100, Math.round(s)));
  },

  /** 政策影响评分（0-100）：权重25% — 新闻标题关键词匹配政策利好/利空 */
  _scorePolicyImpact(news) {
    let s = 40; // 无相关新闻给基础分40
    if (!news || news.length === 0) return s;

    const policyGoodKeywords = [
      '国务院', '央行', '证监会', '发改委', '财政部',
      '支持', '鼓励', '扶持', '补贴', '减税', '降准', '降息',
      '新能源', '人工智能', '数字经济', '绿色', '碳中和',
      '改革', '开放', '创新', '发展战略', '规划', '意见', '通知', '指导意见'
    ];
    const policyBadKeywords = [
      '监管收紧', '限制', '禁止', '处罚', '整改', '核查'
    ];

    let goodCount = 0;
    let badCount = 0;
    const matchedGood = new Set();
    const matchedBad = new Set();

    for (const item of news) {
      const title = (item.title || '');
      // 政策利好匹配
      for (const kw of policyGoodKeywords) {
        if (title.includes(kw)) {
          matchedGood.add(kw);
          goodCount++;
        }
      }
      // 政策利空匹配
      for (const kw of policyBadKeywords) {
        if (title.includes(kw)) {
          matchedBad.add(kw);
          badCount++;
        }
      }
    }

    // 利好加分（每条6-10分，设上限）
    if (goodCount >= 3) s += 25;
    else if (goodCount === 2) s += 18;
    else if (goodCount === 1) s += 10;

    // 关键词多样性加分（不同类型政策）
    if (matchedGood.size >= 4) s += 8;
    else if (matchedGood.size >= 2) s += 4;

    // 利空扣分
    if (badCount >= 2) s -= 20;
    else if (badCount === 1) s -= 12;

    // 总上限：最高不超过95
    return Math.max(0, Math.min(95, Math.round(s)));
  },

  /** 公司消息评分（0-100）：权重20% — 新闻标题关键词匹配公司利好/利空 */
  _scoreCompanyNews(news, stock) {
    let s = 35; // 无相关新闻给基础分35
    if (!news || news.length === 0) return s;

    const companyGoodKeywords = [
      '业绩预增', '扭亏', '超预期', '净利润增长', '中标', '合同',
      '订单', '签约', '增持', '回购', '股权激励', '获批', '通过',
      '认定', '突破', '机构调研', '评级上调', '买入', '战略合作', '分红', '送转'
    ];
    const companyBadKeywords = [
      '减持', '亏损', '下滑', '下降', '处罚', '违规', '警示',
      '退市风险', '诉讼', '纠纷', '质押', '冻结'
    ];

    let goodCount = 0;
    let badCount = 0;

    for (const item of news) {
      const title = (item.title || '');
      let isGood = false;
      let isBad = false;
      for (const kw of companyGoodKeywords) {
        if (title.includes(kw)) { isGood = true; break; }
      }
      for (const kw of companyBadKeywords) {
        if (title.includes(kw)) { isBad = true; break; }
      }
      if (isGood) goodCount++;
      if (isBad) badCount++;
    }

    // 每条利好+8~12分（数量越多单条越高，但递减）
    if (goodCount >= 3) s += 28;
    else if (goodCount === 2) s += 20;
    else if (goodCount === 1) s += 10;

    // 每条利空-8~-12分
    if (badCount >= 2) s -= 22;
    else if (badCount === 1) s -= 12;

    // 多空抵消后极端值限制
    return Math.max(0, Math.min(95, Math.round(s)));
  },

  /** 板块热度评分（0-100） */
  _scoreSectorHeat(sector) {
    if (!sector) return 30;
    let s = 40;
    const chg = sector.changePct || 0;
    // 板块涨幅
    if (chg >= 4) s += 30;
    else if (chg >= 3) s += 25;
    else if (chg >= 2) s += 20;
    else if (chg >= 1) s += 15;
    else if (chg >= 0.3) s += 8;
    else if (chg >= 0) s += 3;
    else s -= 10;
    // 板块内上涨家数（越多越热）
    const up = sector.upCount || 0;
    const down = sector.downCount || 0;
    if (up >= 20 && up > down * 3) s += 20;      // 板块普涨+涨停家数多
    else if (up >= 15 && up > down * 2) s += 15;
    else if (up >= 10) s += 10;
    else if (up >= 5) s += 5;
    else s -= 5;
    // 板块主力净流入
    const flow = sector.mainFlow || 0;
    if (flow > 5e9) s += 10;       // 50亿以上
    else if (flow > 2e9) s += 7;   // 20亿以上
    else if (flow > 5e8) s += 4;   // 5亿以上
    else if (flow > 0) s += 1;
    else s -= 8;
    return Math.max(0, Math.min(100, s));
  },

  /** 主力资金评分（0-100）：近2日主力累计 + 游资活跃度（换手率） + 板块资金配合 */
  _scoreCapitalFlow(stock, flowData, sector) {
    let s = 40;
    // 近2日主力累计净流入
    const flowSum = (flowData && flowData.mainFlowSum2) || 0;
    const amt = stock.amount || 1;
    const flowRatio = flowSum / amt;  // 主力净流入 / 成交额
    if (flowRatio > 0.3) s += 30;        // 主力净流入占成交额30%+
    else if (flowRatio > 0.2) s += 25;
    else if (flowRatio > 0.1) s += 20;
    else if (flowRatio > 0.05) s += 15;
    else if (flowRatio > 0) s += 8;
    else if (flowRatio > -0.05) s += 0;
    else if (flowRatio > -0.15) s -= 10;
    else s -= 25;

    // 当日主力净流入占比
    const todayFlow = (flowData && flowData.today && flowData.today.main) || 0;
    const todayRatio = todayFlow / amt;
    if (todayRatio > 0.15) s += 10;
    else if (todayRatio > 0.05) s += 6;
    else if (todayRatio < -0.1) s -= 8;

    // 游资席位活跃度（换手率）
    const tr = stock.turnover || 0;
    if (tr >= 3 && tr <= 10) s += 10;        // 活跃健康
    else if (tr >= 10 && tr <= 18) s += 5;   // 活跃偏高
    else if (tr > 18) s -= 5;                // 过度换手，风险
    else if (tr >= 1 && tr < 3) s += 2;
    else s -= 8;

    // 板块主力资金配合
    if (sector && sector.mainFlow > 1e9) s += 5;
    else if (sector && sector.mainFlow > 0) s += 2;
    else if (sector && sector.mainFlow < -5e8) s -= 5;

    return Math.max(0, Math.min(100, s));
  },

  /** 量价技术评分（0-100）：5/10日线企稳 + 缩量回调温和放量 + 不破短期支撑 + MACD绿柱缩短即将金叉 */
  _scoreShortTermTech(klines, stock) {
    if (!klines || klines.length < 15) return 40;
    let s = 40;
    const closes = klines.map(k => k.close);
    const vols = klines.map(k => k.volume);
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];

    const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const ma10 = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const ma20 = closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;

    // 1) 股价回踩5/10日线企稳（关键）
    const distMA5 = (current - ma5) / ma5 * 100;
    const distMA10 = (current - ma10) / ma10 * 100;
    // 当前价贴近MA5/MA10（-2%到+3%之间视为企稳）
    if (distMA5 >= -2 && distMA5 <= 3) s += 10;
    if (distMA10 >= -3 && distMA10 <= 4) s += 8;
    // 今日是上涨（企稳反弹确认）
    if (current > prev) s += 4;
    // 跌破MA5且继续走弱 -> 扣分
    if (distMA5 < -3 && current < prev) s -= 10;

    // 2) 缩量回调后温和放量
    if (klines.length >= 6) {
      const volAvg5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const volAvg10 = vols.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const volToday = vols[vols.length - 1];
      const volYesterday = vols[vols.length - 2];
      const volPrev2 = vols[vols.length - 3];
      // 前几日缩量、今日温和放量（0.8-1.5倍5日均量）
      if (volYesterday < volAvg10 * 0.85 && volToday >= volAvg5 * 0.85 && volToday <= volAvg5 * 1.6) {
        s += 10;
      }
      // 连续2日缩量、今日放量（完美形态）
      if (volPrev2 < volAvg10 * 0.8 && volYesterday < volAvg10 * 0.85 && volToday > volAvg5 * 1.0) {
        s += 6;
      }
      // 持续放量（量比>2）但涨幅不大 -> 警惕出货
      if (volToday > volAvg5 * 2.2 && Math.abs(stock.changePct || 0) < 1.5) s -= 8;
    }

    // 3) 不破关键短期支撑（MA20或近10日低点）
    if (ma20 && current >= ma20) s += 5;
    else if (ma20 && current < ma20) s -= 10;
    const recentLow = Math.min(...closes.slice(-10));
    if (current > recentLow * 1.01) s += 3;
    else s -= 5;

    // 4) MACD绿柱缩短、即将金叉
    const macd = this.calcMACD(closes);
    if (macd) {
      // 绿柱缩短：MACD柱由大负数变小
      if (macd.macd < 0 && macd.macd > -0.3) s += 8;
      if (macd.macd > 0 && macd.dif > macd.dea) s += 6;   // 已金叉
      // DIF上穿DEA -> 即将金叉
      if (macd.dif > 0 && macd.dea > 0 && macd.dif > macd.dea) s += 5;
      // 但仍在零轴下方空头区
      if (macd.dif < 0 && macd.dea < 0 && macd.macd < -0.5) s -= 6;
    }

    // 5) RSI不要超买
    const rsi = this.calcRSI(closes, 6);
    if (rsi >= 40 && rsi <= 65) s += 4;
    else if (rsi > 75) s -= 8;

    return Math.max(0, Math.min(100, s));
  },

  /** 趋势动量评分（0-100）：预判未来上涨概率的核心指标 */
  _scoreTrendMomentum(klines, stock) {
    if (!klines || klines.length < 20) return 40;
    let s = 45;
    const closes = klines.map(k => k.close);
    const vols = klines.map(k => k.volume);
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];

    // 1) 短期价格动量（近3日涨幅方向+加速度）
    const chg1 = (current - prev) / prev * 100;
    const chg3 = closes.length >= 4
      ? (current - closes[closes.length - 4]) / closes[closes.length - 4] * 100
      : chg1;
    // 温和上涨最佳（每日0.5%-3%），避免暴涨暴跌
    if (chg1 > 0 && chg1 <= 3 && chg3 > 0 && chg3 <= 8) s += 15;
    else if (chg1 > 0 && chg3 > 0) s += 8;
    else if (chg1 < -3) s -= 12;
    else if (chg1 < 0) s -= 5;

    // 2) MACD柱变化趋势（核心预判信号）
    const macd = this.calcMACD(closes);
    if (macd) {
      // 绿柱缩短→红柱将至（最典型的上攻信号）
      if (macd.macd < 0 && macd.macd > -0.25) s += 12;
      // 金叉且DIF向上
      if (macd.dif > macd.dea && macd.macd > 0) s += 10;
      // 刚金叉（DIF刚超DEA）
      if (macd.dif > 0 && macd.dea > -0.1 && macd.dif > macd.dea) s += 6;
      // 零轴上方死叉前兆（DIF下穿DEA风险）
      if (macd.dif < macd.dea && macd.dif > 0 && macd.macd < 0) s -= 8;
      // 零轴下方持续恶化
      if (macd.dif < 0 && macd.dea < 0 && macd.macd < -0.5) s -= 8;
    }

    // 3) KDJ金叉（比MACD更灵敏的短期信号）
    const kdj = this.calcKDJ(closes);
    // 金叉：K上穿D，且J值合理（非超买区）
    if (kdj.k > kdj.d && kdj.j < 80) s += 10;
    // J值从超卖区回升（J<0后开始拐头）
    if (kdj.j < 20 && kdj.k > kdj.d) s += 8;
    // 超买风险
    if (kdj.j > 100) s -= 6;
    // KDJ死叉
    if (kdj.k < kdj.d && kdj.j > 80) s -= 5;

    // 4) 量能趋势（量价配合）
    if (klines.length >= 6) {
      const volAvg5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const volToday = vols[vols.length - 1];
      const volYesterday = vols[vols.length - 2];
      const volRatio = volToday / (volYesterday || 1);
      // 今日放量+价格上涨（有效放量）
      if (volRatio > 1.3 && chg1 > 0) s += 10;
      // 缩量且价格下跌（弱势）
      else if (volRatio < 0.7 && chg1 < 0) s -= 8;
      // 温和放量（健康）
      else if (volRatio > 1.0 && volRatio < 2.0 && chg1 > 0) s += 5;
      // 暴涨放量（警惕出货）
      if (volRatio > 3 && chg1 > 5) s -= 5;
    }

    // 5) 均线多头排列（趋势方向确认）
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);
    if (ma5 && ma10 && ma20) {
      // 完美多头排列
      if (ma5 > ma10 && ma10 > ma20 && current > ma5) s += 12;
      // MA5上穿MA10（即将多头排列）
      else if (ma5 > ma10 && current > ma5) s += 8;
      // 空头排列
      else if (ma5 < ma10 && ma10 < ma20) s -= 10;
      // 价格在MA20之下
      if (current < ma20) s -= 5;
    }

    // 6) 连续阳线（短线强势信号）
    if (klines.length >= 3) {
      const upDays = [0, 1, 2].filter(i => {
        const c = closes[closes.length - 1 - i];
        const p = closes[closes.length - 2 - i];
        return c > p;
      }).length;
      if (upDays === 3) s += 6;       // 三连阳
      else if (upDays === 2) s += 3;
      const downDays = [0, 1, 2].filter(i => {
        const c = closes[closes.length - 1 - i];
        const p = closes[closes.length - 2 - i];
        return c < p;
      }).length;
      if (downDays === 3) s -= 6;
    }

    return Math.max(0, Math.min(100, s));
  },

  /** 综合趋势预测评分（0-100）：预判未来上涨概率 */
  _scoreTrendPrediction(klines, stock, flowData) {
    let s = 0;
    // 动量信号（最重要）
    const momentum = this._scoreTrendMomentum(klines, stock);
    s += momentum * 0.55;
    // 资金面配合（主力资金方向验证）
    if (flowData && flowData.flows && flowData.flows.length > 0) {
      const flows = flowData.flows;
      const mainSum = flows.reduce((acc, f) => acc + (f.main || 0), 0);
      const todayMain = flows.length > 0 ? flows[flows.length - 1].main : 0;
      // 连续多日主力净流入（强势蓄力）
      const inflowDays = flows.filter(f => f.main > 0).length;
      if (inflowDays === flows.length && flows.length >= 3) s += 20;
      else if (inflowDays >= flows.length * 0.66) s += 12;
      else if (mainSum > 0) s += 6;
      else s -= 8;
      // 今日主力资金方向与动量一致（加分）
      if (todayMain > 0 && momentum >= 60) s += 8;
      else if (todayMain < -1e8 && momentum < 40) s -= 5;
    } else {
      s += 40 * 0.45; // 无资金数据时给中性分
    }
    return Math.max(0, Math.min(100, Math.round(s)));
  },

  /** 短线上涨逻辑（对应新四维度：主力动向+板块趋势+政策影响+公司消息） */
  _getShortTermLogic(stock, sector, flowData, klines, capitalScore, sectorScore, policyScore, newsScore, news, chip, sr) {
    const lines = [];
    // 主力动向逻辑
    const todayMain = (flowData && flowData.today && flowData.today.main) || 0;
    const todayYi = (todayMain / 1e8).toFixed(2);
    if (capitalScore >= 75) lines.push(`主力资金大幅净流入${todayYi}亿，超大单大单持续抢筹，资金加速进场`);
    else if (capitalScore >= 60) lines.push(`主力资金净流入${todayYi}亿，筹码集中度提升，资金面偏多`);
    else if (capitalScore >= 40) lines.push(`主力资金整体中性，多空力量相对均衡`);
    else lines.push(`主力资金呈净流出态势，需警惕筹码松动风险`);
    // 板块趋势逻辑
    if (sectorScore >= 75) lines.push(`所属【${sector ? sector.name : ''}】板块趋势向好，资金+涨家数共振，板块效应强`);
    else if (sectorScore >= 55) lines.push(`所属【${sector ? sector.name : ''}】板块偏强，行业景气度较高`);
    else lines.push(`板块趋势一般，主要依赖个股自身驱动`);
    // 政策影响逻辑
    if (policyScore >= 75) lines.push(`政策面利好密集催化，顶层政策+产业规划双重加持`);
    else if (policyScore >= 60) lines.push(`有相关政策利好支持，行业发展环境改善`);
    else if (policyScore >= 45) lines.push(`政策面整体中性，暂无明显利好或利空`);
    else lines.push(`政策面存在一定利空因素，需关注监管风险`);
    // 公司消息逻辑
    if (newsScore >= 70) {
      const goodNews = (news || []).filter(n => {
        const kws = ['业绩预增', '扭亏', '超预期', '净利润增长', '中标', '合同', '订单', '签约', '增持', '回购', '股权激励', '获批', '突破', '战略合作'];
        return kws.some(kw => (n.title || '').includes(kw));
      });
      if (goodNews.length > 0) {
        lines.push(`公司消息面利好：${goodNews[0].title.substring(0, 25)}，基本面催化明确`);
      } else {
        lines.push(`公司基本面出现积极信号，消息面偏多`);
      }
    } else if (newsScore >= 50) {
      lines.push(`公司消息面整体平稳，暂无重大利好或利空`);
    } else {
      const badNews = (news || []).filter(n => {
        const kws = ['减持', '亏损', '下滑', '下降', '处罚', '违规', '警示', '退市风险', '诉讼', '质押', '冻结'];
        return kws.some(kw => (n.title || '').includes(kw));
      });
      if (badNews.length > 0) {
        lines.push(`公司消息面需谨慎：${badNews[0].title.substring(0, 25)}`);
      } else {
        lines.push(`公司消息面偏空，需关注潜在风险`);
      }
    }
    // 筹码结构逻辑
    if (chip) {
      const pr = chip.profitRatio;
      const conc = chip.concentration;
      const rChip = chip.resistanceChip;
      const cur = stock.price;
      if (pr >= 50 && pr <= 80 && conc > 0 && conc < 15) {
        lines.push(`筹码结构健康：获利盘${pr}%，筹码集中（集中度${conc}%），主力控盘明显`);
      } else if (pr > 90) {
        lines.push(`获利盘高达${pr}%，短线获利盘丰厚，注意获利回吐`);
      } else if (pr < 30) {
        lines.push(`上方套牢盘较多（获利盘仅${pr}%），反弹需放量突破`);
      } else if (conc > 0 && conc < 15) {
        lines.push(`筹码集中度${conc}%，主力吸筹迹象明显`);
      }
      if (rChip > cur) {
        const dist = ((rChip - cur) / cur * 100).toFixed(1);
        if (dist < 2) lines.push(`当前价紧贴上方筹码峰${rChip.toFixed(2)}，突破需放量确认`);
        else if (dist <= 8) lines.push(`上方第一压力位${rChip.toFixed(2)}（+${dist}%），空间内阻力较小`);
      }
    }
    return lines;
  },

  /** 短线下跌风险（至少2条） */
  _getShortTermRisks(stock, klines, flowData, chip, sr) {
    const risks = [];
    const tr = stock.turnover || 0;
    const chg = stock.changePct || 0;
    const amt = (stock.amount || 0) / 1e8;  // 成交额（亿）
    const flowSum = (flowData && flowData.mainFlowSum2) || 0;
    const pe = stock.pe || 0;

    // 1) 板块题材兑现风险
    if (chg >= 5) risks.push('个股当日大涨，短线获利盘丰厚，次日题材兑现易遭获利回吐');
    else if (chg >= 2) risks.push('短线已有一定浮盈，盘中震荡洗盘概率上升');

    // 2) 主力出货风险
    if (tr > 15) risks.push('换手率过高（' + tr.toFixed(1) + '%），游资接力失败风险大，谨防高位砸盘');
    else if (tr > 10) risks.push('换手率偏高，主力分歧加大，追高易成接盘');

    // 3) 资金流出风险
    if (flowSum < -1e8) risks.push('近2日主力累计净流出，资金已在离场，反弹持续性存疑');
    else if (flowSum < 0) risks.push('主力资金小幅流出，筹码松动需警惕');

    // 4) 筹码结构风险
    if (chip) {
      if (chip.profitRatio > 92) risks.push('获利盘' + chip.profitRatio + '%，高位筹码松动，获利回吐压力大');
      else if (chip.profitRatio < 25) risks.push('套牢盘占比高（获利盘仅' + chip.profitRatio + '%），反弹易遭解套抛压');
      if (chip.resistanceChip > stock.price) {
        const gap = ((chip.resistanceChip - stock.price) / stock.price * 100).toFixed(1);
        if (gap < 2) risks.push('上方' + chip.resistanceChip.toFixed(2) + '处筹码峰密集，强压力位需放量突破');
      }
    }

    // 5) 技术位压力（与筹码压力互为补充）
    if (klines && klines.length >= 20) {
      const closes = klines.map(k => k.close);
      const high20 = Math.max(...closes.slice(-20));
      if (stock.price >= high20 * 0.98) risks.push('股价接近近20日高点，上方套牢盘和获利盘双重压力');
    }
    if (sr && sr.resistance > stock.price) {
      const gap = (sr.resistance - stock.price) / stock.price * 100;
      if (gap < 1.5) risks.push('当前价距技术压力位' + sr.resistance.toFixed(2) + '仅' + gap.toFixed(1) + '%，上行空间有限');
    }

    // 6) 估值风险
    if (pe > 80 || pe < 0) risks.push('当前PE极高或亏损，题材炒作一旦退潮跌幅剧烈');
    else if (pe > 50) risks.push('估值偏高，业绩证伪后易补跌');

    // 7) 大盘系统性风险（普适）
    risks.push('若大盘跳水或板块整体走弱，个股难以独善其身');

    // 8) 量能衰减
    if (klines && klines.length >= 5) {
      const vols = klines.slice(-5).map(k => k.volume);
      if (vols[4] < vols[3] * 0.7 && vols[3] < vols[2] * 0.7) {
        risks.push('连续缩量，量能持续萎缩下反弹难以为继');
      }
    }

    // 9) 市值/流动性风险
    if (stock.marketCap && stock.marketCap < 50 && tr < 2) risks.push('小市值低流动性，易被游资快进快出');

    // 保底至少2条
    if (risks.length < 2) {
      risks.push('短线波动剧烈，情绪反转可能带来快速回落');
      if (risks.length < 2) risks.push('市场整体环境存在不确定性，系统性风险需防范');
    }
    return risks.slice(0, 5);  // 最多5条（新增筹码风险）
  },

  /** 切换短线TOP20排序方式 */
  resortShortTerm(sortKey) {
    if (!this._shortTermAll || !this._shortTermAll.length) return;
    this._shortTermSortKey = sortKey;
    const list = this._shortTermAll.slice();
    switch (sortKey) {
      case 'capital':   // 主力动向
        list.sort((a, b) => (b.capitalScore || 0) - (a.capitalScore || 0));
        break;
      case 'sector':    // 板块趋势
        list.sort((a, b) => (b.sectorScore || 0) - (a.sectorScore || 0));
        break;
      case 'policy':    // 政策影响
        list.sort((a, b) => (b.policyScore || 0) - (a.policyScore || 0));
        break;
      case 'news':      // 公司消息
        list.sort((a, b) => (b.newsScore || 0) - (a.newsScore || 0));
        break;
      case 'quant':     // 量化分
        list.sort((a, b) => (b.quantScore || 0) - (a.quantScore || 0));
        break;
      case 'change':    // 涨幅
        list.sort((a, b) => (b.changePct || 0) - (a.changePct || 0));
        break;
      case 'profit':    // 获利盘（低到高=套牢少到多，筹码健康度反向不好定义；这里按获利盘适中优先）
        list.sort((a, b) => {
          const pa = a.chip ? a.chip.profitRatio : 50;
          const pb = b.chip ? b.chip.profitRatio : 50;
          // 离健康中枢65越近越靠前
          return Math.abs(pb - 65) - Math.abs(pa - 65);
        });
        break;
      case 'composite': // 综合（默认）
      default:
        list.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
    }
    const ctx = this._shortTermCtx || { topSectors: [], fallbackMode: 'normal' };
    this.renderShortTermTop10(list, ctx.topSectors, ctx.fallbackMode, sortKey);
  },

  /** 渲染短线TOP20列表 */
  renderShortTermTop10(top10, topSectors, fallbackMode, sortKey) {
    sortKey = sortKey || this._shortTermSortKey || 'composite';
    const container = document.getElementById('hotStocks');
    if (!top10 || top10.length === 0) {
      container.innerHTML = '<div class="empty-tip">未筛选到符合条件的短线标的，建议观望</div>';
      return;
    }
    // 数据源标签
    const modeLabel = {
      'normal': '🟢 行业板块数据',
      'concept': '🟡 概念板块数据（行业板块降级）',
      'market': '🟠 全市场活跃股（板块接口降级）',
      'static': '⚪ 静态热门池（全部接口降级）'
    }[fallbackMode] || '🟢 行业板块数据';
    // 板块标签
    const sectorHtml = topSectors.map((s, i) => {
      const chgCls = s.changePct > 0 ? 'up' : s.changePct < 0 ? 'down' : '';
      return `<span class="sector-tag"><b>${s.name}</b> <span class="${chgCls}">${s.changePct > 0 ? '+' : ''}${s.changePct.toFixed(2)}%</span></span>`;
    }).join('');

    // 股票卡片
    const stockHtml = top10.map((s, i) => {
      const rankCls = i < 3 ? 'rank-top3' : 'rank-normal';
      const catTag = s.category === '日内'
        ? '<span class="st-cat-tag cat-day">日内超短</span>'
        : '<span class="st-cat-tag cat-wave">3-5日波段</span>';
      const change = s.changePct || 0;
      const cls = Utils.colorClass(change);
      const changeStr = (change > 0 ? '+' : '') + change.toFixed(2) + '%';

      const logicHtml = s.logic.map(l => `<div class="st-logic-item">· ${l}</div>`).join('');
      const riskHtml = s.risks.map(r => `<div class="st-risk-item">⚠ ${r}</div>`).join('');

      // 筹码结构 + 压力位信息
      const chip = s.chip || {};
      const sr = s.sr || {};
      const profitRatio = chip.profitRatio != null ? chip.profitRatio : 50;
      const profitColor = profitRatio >= 50 && profitRatio <= 80 ? '#00c853' : profitRatio > 90 ? '#ef4444' : profitRatio < 20 ? '#ff8c00' : '#ffa500';
      const concentration = chip.concentration || 0;
      const concText = concentration > 0 && concentration < 15 ? '集中' : concentration > 30 ? '分散' : concentration > 0 ? '适中' : '--';
      const concColor = concentration > 0 && concentration < 15 ? '#00c853' : concentration > 30 ? '#ff8c00' : '#ffa500';
      const supportChip = chip.supportChip || 0;
      const resistanceChip = chip.resistanceChip || 0;
      const pressureDistance = chip.pressureDistance || 0;
      const srResistance = sr.resistance || 0;
      const srSupport = sr.support || 0;
      // 取最近且更保守的压力位
      const nearestResistance = (resistanceChip > 0 && srResistance > 0)
        ? Math.min(resistanceChip, srResistance)
        : (resistanceChip || srResistance || 0);
      const nearestSupport = (supportChip > 0 && srSupport > 0)
        ? Math.max(supportChip, srSupport)
        : (supportChip || srSupport || 0);
      const chipHtml = `
        <div class="st-chip-row">
          <div class="st-chip-item">
            <span class="st-chip-label">获利盘</span>
            <span class="st-chip-val" style="color:${profitColor}">${profitRatio}%</span>
          </div>
          <div class="st-chip-item">
            <span class="st-chip-label">筹码</span>
            <span class="st-chip-val" style="color:${concColor}">${concText}</span>
          </div>
          <div class="st-chip-item">
            <span class="st-chip-label">筹码支撑</span>
            <span class="st-chip-val" style="color:#00c853">${supportChip ? supportChip.toFixed(2) : '--'}</span>
          </div>
          <div class="st-chip-item">
            <span class="st-chip-label">压力位</span>
            <span class="st-chip-val" style="color:#ef4444">${nearestResistance ? nearestResistance.toFixed(2) : '--'}</span>
          </div>
          ${pressureDistance > 0 ? `<div class="st-chip-item"><span class="st-chip-label">上行空间</span><span class="st-chip-val" style="color:#00d4ff">+${pressureDistance}%</span></div>` : ''}
        </div>`;

      // 量化分和操作分（统一阈值80/65/50/35）
      const quantScore = s.quantScore || 0;
      const quantColor = Utils.scoreColor(quantScore);
      const quantStars = Utils.scoreLevel(quantScore);
      const opAdvice = s.opAdvice || { icon: '⚖️', text: '观望' };
      const opBg = quantScore >= 80 ? 'rgba(0,200,83,0.15)' : quantScore >= 65 ? 'rgba(0,200,83,0.1)' : quantScore >= 50 ? 'rgba(255,165,0,0.15)' : quantScore >= 35 ? 'rgba(255,120,0,0.15)' : 'rgba(255,71,87,0.15)';
      const opColor = Utils.scoreColor(quantScore);

      return `
        <div class="hot-stock-item st-card" onclick="App.analyzeStock('${s.code}')">
          <div class="st-head">
            <div class="rank ${rankCls}">${i + 1}</div>
            <div class="hs-info">
              <div class="hs-name">${s.name} ${catTag}</div>
              <div class="hs-code">${s.code} · ${s.sectorName}</div>
            </div>
            <div class="hs-price">
              <div class="hs-price-val ${cls}">${s.price.toFixed(2)}</div>
              <div class="hs-change-val ${cls}">${changeStr}</div>
            </div>
          </div>
          <div class="st-quant-op-row">
            <div class="st-quant-box">
              <div class="st-qb-label">量化分</div>
              <div class="st-qb-val" style="color:${quantColor}">${quantScore}<span class="st-qb-stars">${quantStars}</span></div>
            </div>
            <div class="st-op-box" style="background:${opBg};color:${opColor}">
              <div class="st-ob-label">操作分</div>
              <div class="st-ob-val">${opAdvice.icon} ${opAdvice.text}</div>
            </div>
          </div>
          ${chipHtml}
          <div class="st-section">
            <div class="st-section-title st-logic-title">📈 上涨逻辑</div>
            ${logicHtml}
          </div>
          <div class="st-section">
            <div class="st-section-title st-risk-title">📉 下跌风险（必读）</div>
            ${riskHtml}
          </div>
        </div>
      `;
    }).join('');

    // 统一风控规则
    const riskControlHtml = `
      <div class="st-risk-control">
        <div class="st-rc-title">🛡️ 统一短线风控规则</div>
        <div class="st-rc-row"><span class="st-rc-label">单只仓位上限</span><span class="st-rc-val">不超过总资金的 <b>10%</b></span></div>
        <div class="st-rc-row"><span class="st-rc-label">日内超短入场</span><span class="st-rc-val">回踩5日线附近低吸，<b>不追涨</b></span></div>
        <div class="st-rc-row"><span class="st-rc-label">3-5日波段入场</span><span class="st-rc-val">回踩10日线/布林中轨企稳再介入</span></div>
        <div class="st-rc-row"><span class="st-rc-label">硬性止损点位</span><span class="st-rc-val">跌破买入价 <b style="color:#ef4444">-3%</b> 立即止损，不抱幻想</span></div>
        <div class="st-rc-row"><span class="st-rc-label">止盈离场标准</span><span class="st-rc-val">日内+5%分批止盈；波段+10%或放量滞涨离场</span></div>
        <div class="st-rc-row"><span class="st-rc-label">总账户仓位</span><span class="st-rc-val">短线总仓位不超过 <b>50%</b>，保留现金应对突发</span></div>
        <div class="st-rc-tip">⚠ 所有标的仅为短线逻辑梳理，<b>不构成投资建议</b>。严格执行止损，不抗单。</div>
      </div>
    `;

    // 排序工具栏
    const sortBtns = [
      { key: 'composite', label: '综合' },
      { key: 'capital', label: '主力' },
      { key: 'sector', label: '板块' },
      { key: 'policy', label: '政策' },
      { key: 'news', label: '消息' },
      { key: 'quant', label: '量化分' },
      { key: 'change', label: '涨幅' },
      { key: 'profit', label: '筹码' }
    ];
    const sortBarHtml = `
      <div class="st-sort-bar">
        <span class="st-sort-label">排序：</span>
        ${sortBtns.map(b => `
          <button class="st-sort-btn ${sortKey === b.key ? 'active' : ''}"
                  onclick="App.resortShortTerm('${b.key}')">${b.label}</button>
        `).join('')}
      </div>`;

    container.innerHTML = `
      <div class="st-source-mode">${modeLabel} <button class="st-retry-btn" onclick="App.loadHotStocks()">🔄 刷新</button></div>
      <div class="st-top-sectors">${sectorHtml}</div>
      ${sortBarHtml}
      ${stockHtml}
      ${riskControlHtml}
    `;
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

  /** 更新关注按钮状态 */
  _updateWatchlistBtn(code) {
    const btn = document.getElementById('btnWatchlist');
    const icon = document.getElementById('watchlistIcon');
    const text = document.getElementById('watchlistText');
    if (!btn || !icon || !text) return;
    if (Watchlist.has(code)) {
      btn.classList.add('active');
      icon.textContent = '★';
      text.textContent = '已在自选';
    } else {
      btn.classList.remove('active');
      icon.textContent = '☆';
      text.textContent = '加入自选';
    }
  },

  /** 分析页切换关注状态 */
  toggleWatchlistFromAnalysis() {
    const code = this.currentStock;
    if (!code) return;
    if (Watchlist.has(code)) {
      Watchlist.remove(code);
    } else {
      Watchlist.add(code);
    }
    this._updateWatchlistBtn(code);
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
    ['sevenDimCard', 'diagnosticResult', 'vwapCard', 'newsCard', 'conclusionCard', 'techChartCard', 'riskAlertCard', 'klineCard'].forEach(id => {
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
      try { this.renderStockSummary(quote, code); } catch(e) { console.warn('[分析] renderStockSummary异常:', e); }

      // K线图（主图：MA/BOLL叠加 + 成交量副图）
      if (klines && klines.length > 10) {
        try { this.renderKline(klines, quote, { count: this._klineCount || 60, overlay: this._klineOverlay || 'ma' }); } catch(e) { console.warn('[分析] renderKline异常:', e); }
      }

      // 七维度评分
      let scores;
      try {
        scores = SevenDimAnalyzer.analyze(quote, klines, capitalFlow);
      } catch(e) {
        console.warn('[分析] 七维度评分异常:', e);
        scores = { total: 50, dims: { fundamental: 50, technical: 50, capital: 50, valuation: 50, sentiment: 50 }, message: '', macro: 50, risk: 50 };
      }

      // 持仓诊断
      let report;
      try {
        report = DiagnosticEngine.generateReport(quote, klines, capitalFlow, news, scores);
      } catch(e) {
        console.warn('[分析] 诊断报告异常:', e);
        report = { mod1: '', mod2: '', mod3: '', mod4: '', mod5: { html: '', risks: [] }, mod6: '', mod7: '', mod8: '', riskSummary: '' };
      }

      // ===== 结论前置：先渲染操作建议摘要和主力成本 =====
      try { this.renderConclusionSummary(quote, klines, capitalFlow, scores); } catch(e) { console.warn('[分析] renderConclusionSummary异常:', e); }

      // VWAP已在conclusionSummary中显示，不再单独渲染vwapCard

      // 然后渲染七维度评分
      try { this.renderSevenDim(scores); } catch(e) { console.warn('[分析] renderSevenDim异常:', e); }

      // 渲染技术指标图表
      if (klines && klines.length > 10) {
        try { this.renderTechnicalCharts(klines, quote); } catch(e) { console.warn('[分析] renderTechnicalCharts异常:', e); }
      }

      // 风险预警检测
      try { this.renderRiskWarning(quote, klines); } catch(e) { console.warn('[分析] renderRiskWarning异常:', e); }

      // 持仓诊断详细模块
      try { this.renderDiagnostic(report); } catch(e) { console.warn('[分析] renderDiagnostic异常:', e); }

      // 新闻公告
      if (news && news.length > 0) {
        try { this.renderNews(news); } catch(e) { console.warn('[分析] renderNews异常:', e); }
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

    // 统一使用 getAdvice 判断操作建议
    const advice = Watchlist.getAdvice(totalScore);
    const adviceIcon = advice.icon;
    const adviceType = advice.text;
    let adviceDetail = '';
    if (totalScore >= 80) {
      adviceDetail = '基本面和技术面表现优秀，建议持有并分批锁定利润，动态止损上移至成本价上方。';
    } else if (totalScore >= 65) {
      adviceDetail = '量化评分较高，可逢低分批建仓。建议以20日VWAP为参考成本线，分2-3次买入降低风险。';
    } else if (totalScore >= 50) {
      adviceDetail = '量化评分中等，观望为主。等待放量突破或回踩支撑位再决策，设好止损。';
    } else if (totalScore >= 35) {
      adviceDetail = '量化评分偏低，存在一定风险。持仓者可逢高减仓降低风险，空仓者暂勿入场。';
    } else {
      adviceDetail = '量化评分较低，风险因子较多。已持有建议果断止损离场，未持有暂时观望等待企稳。';
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

    // 更新关注按钮状态
    this._updateWatchlistBtn(code);

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
    // 操作分（基于量化评分的操作建议）
    const opAdvice = Watchlist.getAdvice(totalScore);
    const opBg = totalScore >= 80 ? 'rgba(0,200,83,0.15)' : totalScore >= 65 ? 'rgba(0,200,83,0.1)' : totalScore >= 50 ? 'rgba(255,165,0,0.15)' : totalScore >= 35 ? 'rgba(255,120,0,0.15)' : 'rgba(255,71,87,0.15)';
    document.getElementById('totalScore').innerHTML =
      '<div class="total-score-display" style="flex-direction:row;gap:16px;align-items:center;justify-content:center;">' +
      '<div style="text-align:center"><div class="total-score-big" style="color:' + sColor + '">' + totalScore + '</div>' +
      '<div class="total-score-stars">' + starLevel + '</div>' +
      '<div class="total-score-level" style="color:' + sColor + '">量化评分</div></div>' +
      '<div style="width:1px;height:48px;background:rgba(255,255,255,0.1)"></div>' +
      '<div style="text-align:center"><div style="font-size:22px;font-weight:700;color:' + sColor + '">' + opAdvice.icon + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:' + sColor + '">' + opAdvice.text + '</div>' +
      '<div style="font-size:11px;color:#8a8e9b;margin-top:2px">操作分</div></div>' +
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

  /** 渲染K线图
   * @param {Array} klines K线数组
   * @param {Object} quote 行情
   * @param {Object} opts { count: 加载根数, overlay: 'ma'|'boll'|'none', reset: 是否重置工具栏状态 }
   */
  renderKline(klines, quote, opts) {
    if (!klines || klines.length === 0) return;
    this.showSection('klineCard', true);
    this._klineData = klines;
    this._klineQuote = quote;
    if (opts) {
      if (opts.count) this._klineCount = opts.count;
      if (opts.overlay) this._klineOverlay = opts.overlay;
    }

    if (this.klineChart) { this.klineChart.dispose(); this.klineChart = null; }
    const chartDom = document.getElementById('klineChart');
    if (!chartDom) return;
    this.klineChart = echarts.init(chartDom, 'dark');

    const dates = klines.map(k => k.date);
    const ohlc = klines.map(k => [k.open, k.close, k.low, k.high]);
    const volumes = klines.map(k => k.volume);
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    // 主图叠加指标
    const overlaySeries = [];
    let legendHtml = '';
    if (this._klineOverlay === 'ma') {
      const ma5 = Utils.calcMASeries(closes, 5);
      const ma10 = Utils.calcMASeries(closes, 10);
      const ma20 = Utils.calcMASeries(closes, 20);
      const ma60 = closes.length >= 60 ? Utils.calcMASeries(closes, 60) : null;
      overlaySeries.push(
        { name: 'MA5', type: 'line', data: ma5, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.1, color: '#ffd54f' } },
        { name: 'MA10', type: 'line', data: ma10, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.1, color: '#00d4ff' } },
        { name: 'MA20', type: 'line', data: ma20, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.1, color: '#b388ff' } }
      );
      if (ma60) overlaySeries.push({ name: 'MA60', type: 'line', data: ma60, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.1, color: '#ff8a65' } });
      const last = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]; return null; };
      const f = (v) => v == null ? '--' : v.toFixed(2);
      legendHtml = `<span style="color:#ffd54f">MA5 ${f(last(ma5))}</span> <span style="color:#00d4ff">MA10 ${f(last(ma10))}</span> <span style="color:#b388ff">MA20 ${f(last(ma20))}</span>` + (ma60 ? ` <span style="color:#ff8a65">MA60 ${f(last(ma60))}</span>` : '');
    } else if (this._klineOverlay === 'boll') {
      const boll = Utils.calcBOLLSeries(closes, 20, 2);
      overlaySeries.push(
        { name: 'MID', type: 'line', data: boll.mid, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.1, color: '#ffd54f' } },
        { name: 'UPPER', type: 'line', data: boll.upper, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.0, color: '#b388ff' }, areaStyle: { color: 'rgba(179,136,255,0.05)', origin: 'start' } },
        { name: 'LOWER', type: 'line', data: boll.lower, xAxisIndex: 0, yAxisIndex: 0, smooth: true, showSymbol: false, lineStyle: { width: 1.0, color: '#00d4ff' } }
      );
      const last = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]; return null; };
      const f = (v) => v == null ? '--' : v.toFixed(2);
      const lastClose = closes[closes.length - 1];
      const up = last(boll.upper), lo = last(boll.lower), mid = last(boll.mid);
      let pos = '中轨附近';
      if (up != null && lo != null && up > lo) {
        const pct = (lastClose - lo) / (up - lo) * 100;
        if (pct > 90) pos = '触及上轨，警惕回调';
        else if (pct > 60) pos = '中轨上方偏强';
        else if (pct < 10) pos = '触及下轨，关注反弹';
        else if (pct < 40) pos = '中轨下方偏弱';
      }
      legendHtml = `<span style="color:#b388ff">UPPER ${f(up)}</span> <span style="color:#ffd54f">MID ${f(mid)}</span> <span style="color:#00d4ff">LOWER ${f(lo)}</span> <span style="color:#8a8e9b">| ${pos}</span>`;
    }

    const legendEl = document.getElementById('klineLegend');
    if (legendEl) legendEl.innerHTML = legendHtml;

    this.klineChart.setOption({
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', link: [{ xAxisIndex: 'all' }] },
        backgroundColor: 'rgba(19,23,34,0.95)',
        borderColor: '#2a2e3e',
        textStyle: { color: '#e1e3ea', fontSize: 12 }
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: '8%', right: '4%', top: '6%', height: '60%' },
        { left: '8%', right: '4%', top: '74%', height: '18%' }
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
        { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1], bottom: '1%', height: 14, borderColor: '#2a2e3e', backgroundColor: '#131722', fillerColor: 'rgba(0,212,255,0.12)', handleStyle: { color: '#00d4ff' }, textStyle: { color: '#5a5e6b' } }
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
        ...overlaySeries,
        {
          name: '成交量',
          type: 'bar',
          data: volumes.map((v, i) => ({
            value: v,
            itemStyle: { color: klines[i].close >= klines[i].open ? 'rgba(255,71,87,0.55)' : 'rgba(0,230,118,0.55)' }
          })),
          xAxisIndex: 1, yAxisIndex: 1
        }
      ]
    });

    this._bindKlineToolbar();
  },

  /** 绑定K线工具栏（周期切换、主图叠加切换） */
  _bindKlineToolbar() {
    if (this._klineToolbarBound) return;
    this._klineToolbarBound = true;
    const periodBox = document.getElementById('klinePeriods');
    const indBox = document.getElementById('klineIndicators');
    if (periodBox) {
      periodBox.addEventListener('click', async (e) => {
        const btn = e.target.closest('.kline-period');
        if (!btn) return;
        periodBox.querySelectorAll('.kline-period').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const count = parseInt(btn.dataset.count, 10) || 60;
        this._klineCount = count;
        if (!this.currentStock) return;
        try {
          Utils.toast('加载K线...', 800);
          const klines = await DataAPI.fetchKline(this.currentStock, count);
          if (klines && klines.length > 0) this.renderKline(klines, this._klineQuote, { count, overlay: this._klineOverlay });
        } catch (err) { console.warn('[K线] 周期切换失败', err); }
      });
    }
    if (indBox) {
      indBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.kline-ind');
        if (!btn) return;
        indBox.querySelectorAll('.kline-ind').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const overlay = btn.dataset.ind || 'ma';
        this._klineOverlay = overlay;
        if (this._klineData) this.renderKline(this._klineData, this._klineQuote, { count: this._klineCount, overlay });
      });
    }
  },

  /** 渲染技术指标图表（MACD/KDJ/RSI/BOLL/量能） */
  renderTechnicalCharts(klines, quote) {
    this.showSection('techChartCard', true);
    const chartDom = document.getElementById('techChartContent');
    const infoEl = document.getElementById('techChartInfo');
    
    // 取最近120个交易日用于指标计算（显示时再截取最近60根，保证指标warm-up充分）
    const data = klines.slice(-120);
    const closesAll = data.map(k => k.close);
    const highsAll = data.map(k => k.high);
    const lowsAll = data.map(k => k.low);
    const volumesAll = data.map(k => k.volume);

    // MACD序列
    const macdSeries = Utils.calcMACDSeries(closesAll);
    // RSI序列
    const rsi6All = Utils.calcRSISeries(closesAll, 6);
    const rsi14All = Utils.calcRSISeries(closesAll, 14);
    // KDJ序列
    const kdjAll = Utils.calcKDJSeries(closesAll, highsAll, lowsAll, 9);
    // BOLL序列
    const bollAll = Utils.calcBOLLSeries(closesAll, 20, 2);
    // 成交量MA5
    const volMa5All = Utils.calcMASeries(volumesAll, 5);

    // 显示最近60根
    const VIEW = 60;
    const dates = data.slice(-VIEW).map(k => k.date ? k.date.slice(5) : '');
    const sliceArr = (arr) => arr.slice(-VIEW);
    const macdBars = sliceArr(macdSeries.macd);
    const difLine = sliceArr(macdSeries.dif);
    const deaLine = sliceArr(macdSeries.dea);
    const rsi6Arr = sliceArr(rsi6All);
    const rsi14Arr = sliceArr(rsi14All);
    const kArr = sliceArr(kdjAll.k);
    const dArr = sliceArr(kdjAll.d);
    const jArr = sliceArr(kdjAll.j);
    const bollUpper = sliceArr(bollAll.upper);
    const bollMid = sliceArr(bollAll.mid);
    const bollLower = sliceArr(bollAll.lower);
    const closesView = sliceArr(closesAll);
    const volumes = sliceArr(volumesAll);
    const ma5vol = sliceArr(volMa5All);

    // 当前数值（用于信息栏）
    const lastNum = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null && !isNaN(arr[i])) return arr[i]; return null; };
    const curMacd = lastNum(macdSeries.macd) || 0;
    const curDif = lastNum(macdSeries.dif) || 0;
    const curDea = lastNum(macdSeries.dea) || 0;
    const curRsi6 = lastNum(rsi6All) || 50;
    const curRsi14 = lastNum(rsi14All) || 50;
    const curK = lastNum(kdjAll.k) || 50;
    const curD = lastNum(kdjAll.d) || 50;
    const curJ = lastNum(kdjAll.j) || 50;
    const curBollUp = lastNum(bollAll.upper);
    const curBollMid = lastNum(bollAll.mid);
    const curBollLow = lastNum(bollAll.lower);

    if (this.techChart) this.techChart.dispose();
    this.techChart = echarts.init(chartDom, 'dark');

    let currentTab = 'macd';

    const renderChart = (tab) => {
      let option = {};
      const baseGrid = { left: '8%', right: '4%', top: '12%', bottom: '15%' };
      const baseXAxis = { type: 'category', data: dates, axisLabel: { fontSize: 9, color: '#8a8e9b', interval: Math.floor(dates.length/6) }, axisLine: { lineStyle: { color: '#2a2e3e' } } };
      const baseYAxis = { splitLine: { lineStyle: { color: 'rgba(42,46,62,0.5)' } }, axisLabel: { fontSize: 9, color: '#8a8e9b' } };

      if (tab === 'macd') {
        // MACD金叉/死叉标记
        const markPoints = [];
        for (let i = 1; i < macdBars.length; i++) {
          const prev = macdBars[i-1], cur = macdBars[i];
          if (prev != null && cur != null) {
            if (prev <= 0 && cur > 0) markPoints.push({ xAxis: i, yAxis: cur, value: '金叉', itemStyle: { color: '#ff4757' }, label: { show: true, formatter: '金', color: '#fff', fontSize: 9, position: 'top' } });
            else if (prev >= 0 && cur < 0) markPoints.push({ xAxis: i, yAxis: cur, value: '死叉', itemStyle: { color: '#00e676' }, label: { show: true, formatter: '死', color: '#fff', fontSize: 9, position: 'bottom' } });
          }
        }
        option = {
          backgroundColor: 'transparent',
          grid: baseGrid,
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(26,31,46,0.9)', borderColor: '#00d4ff', textStyle: { color: '#fff', fontSize: 11 } },
          xAxis: baseXAxis,
          yAxis: { ...baseYAxis, scale: true },
          series: [
            { name: 'MACD', type: 'bar', data: macdBars.map(v => ({ value: v, itemStyle: { color: v == null ? 'transparent' : (v >= 0 ? 'rgba(255,71,87,0.7)' : 'rgba(0,230,118,0.7)') } })), barWidth: '60%', markPoint: { symbol: 'pin', symbolSize: 28, data: markPoints } },
            { name: 'DIF', type: 'line', data: difLine, lineStyle: { width: 1.5, color: '#00d4ff' }, symbol: 'none', smooth: true },
            { name: 'DEA', type: 'line', data: deaLine, lineStyle: { width: 1.5, color: '#ffa500' }, symbol: 'none', smooth: true }
          ]
        };
        // 状态判断（用上一根与当前根的DIF/DEA）
        const lastIdx = difLine.length - 1;
        let state = '';
        if (difLine[lastIdx] != null && deaLine[lastIdx] != null && difLine[lastIdx-1] != null && deaLine[lastIdx-1] != null) {
          if (difLine[lastIdx-1] <= deaLine[lastIdx-1] && difLine[lastIdx] > deaLine[lastIdx]) state = '🔴 MACD金叉，短期偏多';
          else if (difLine[lastIdx-1] >= deaLine[lastIdx-1] && difLine[lastIdx] < deaLine[lastIdx]) state = '🟢 MACD死叉，短期偏空';
          else if (difLine[lastIdx] > deaLine[lastIdx]) state = '🔴 多头区域（DIF在DEA上方）';
          else state = '🟢 空头区域（DIF在DEA下方）';
        } else state = curDif > curDea ? '🔴 多头区域' : '🟢 空头区域';
        infoEl.textContent = `MACD(12,26,9) | DIF: ${curDif.toFixed(3)} | DEA: ${curDea.toFixed(3)} | MACD: ${curMacd.toFixed(3)} | ${state}`;
      } else if (tab === 'kdj') {
        option = {
          backgroundColor: 'transparent',
          grid: baseGrid,
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(26,31,46,0.9)', borderColor: '#00d4ff', textStyle: { color: '#fff', fontSize: 11 } },
          xAxis: baseXAxis,
          yAxis: { ...baseYAxis, min: -10, max: 110 },
          series: [
            { name: 'K', type: 'line', data: kArr, lineStyle: { width: 1.5, color: '#00d4ff' }, symbol: 'none', smooth: true },
            { name: 'D', type: 'line', data: dArr, lineStyle: { width: 1.5, color: '#ffa500' }, symbol: 'none', smooth: true },
            { name: 'J', type: 'line', data: jArr, lineStyle: { width: 1.2, color: '#b388ff', type: 'dashed' }, symbol: 'none', smooth: true },
            { name: '超买', type: 'line', data: [], markLine: { silent: true, lineStyle: { color: 'rgba(255,71,87,0.5)', type: 'dashed' }, data: [{ yAxis: 80 }], label: { formatter: '超买80', color: '#ff6b81', fontSize: 9 } } },
            { name: '超卖', type: 'line', data: [], markLine: { silent: true, lineStyle: { color: 'rgba(0,230,118,0.5)', type: 'dashed' }, data: [{ yAxis: 20 }], label: { formatter: '超卖20', color: '#00e676', fontSize: 9 } } }
          ]
        };
        let state = '';
        if (curJ >= 100) state = '⚠️ J值超买(≥100)，短线过热警惕回调';
        else if (curK >= 80 && curD >= 80) state = '🔴 K/D高位超买区，注意风险';
        else if (curJ <= 0) state = '⚠️ J值超卖(≤0)，存在反弹可能但需确认';
        else if (curK <= 20 && curD <= 20) state = '🟢 K/D低位超卖区，关注金叉信号';
        else if (curK > curD) state = '🔴 K在D上方，短线偏多';
        else state = '🟢 K在D下方，短线偏空';
        infoEl.textContent = `KDJ(9,3,3) | K: ${curK.toFixed(1)} | D: ${curD.toFixed(1)} | J: ${curJ.toFixed(1)} | ${state}`;
      } else if (tab === 'rsi') {
        option = {
          backgroundColor: 'transparent',
          grid: baseGrid,
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(26,31,46,0.9)', borderColor: '#00d4ff', textStyle: { color: '#fff', fontSize: 11 } },
          xAxis: baseXAxis,
          yAxis: { ...baseYAxis, min: 0, max: 100 },
          series: [
            { name: 'RSI(6)', type: 'line', data: rsi6Arr, lineStyle: { width: 1.5, color: '#00d4ff' }, symbol: 'none', smooth: true },
            { name: 'RSI(14)', type: 'line', data: rsi14Arr, lineStyle: { width: 1.5, color: '#ffa500' }, symbol: 'none', smooth: true },
            { name: '超买线', type: 'line', markLine: { silent: true, lineStyle: { color: 'rgba(255,71,87,0.5)', type: 'dashed' }, data: [{ yAxis: 70 }], label: { formatter: '超买70', color: '#ff6b81', fontSize: 9 } }, data: [] },
            { name: '超卖线', type: 'line', markLine: { silent: true, lineStyle: { color: 'rgba(0,230,118,0.5)', type: 'dashed' }, data: [{ yAxis: 30 }], label: { formatter: '超卖30', color: '#00e676', fontSize: 9 } }, data: [] }
          ]
        };
        let rsiState = '';
        if (curRsi14 >= 80) rsiState = '⚠️ 极度超买，回调风险极高';
        else if (curRsi14 >= 70) rsiState = '🔴 超买区域，注意回调风险';
        else if (curRsi14 <= 20) rsiState = '⚠️ 极度超卖，可能存在反弹机会';
        else if (curRsi14 <= 30) rsiState = '🟢 超卖区域，关注反弹信号';
        else rsiState = '⚖️ RSI中性区域';
        infoEl.textContent = `RSI(6)≈${curRsi6.toFixed(1)} | RSI(14)≈${curRsi14.toFixed(1)} | ${rsiState}`;
      } else if (tab === 'boll') {
        option = {
          backgroundColor: 'transparent',
          grid: baseGrid,
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(26,31,46,0.9)', borderColor: '#00d4ff', textStyle: { color: '#fff', fontSize: 11 } },
          xAxis: baseXAxis,
          yAxis: { ...baseYAxis, scale: true },
          series: [
            { name: '收盘价', type: 'line', data: closesView, lineStyle: { width: 1.5, color: '#fff' }, symbol: 'none', smooth: false },
            { name: 'MID', type: 'line', data: bollMid, lineStyle: { width: 1.2, color: '#ffd54f' }, symbol: 'none', smooth: true },
            { name: 'UPPER', type: 'line', data: bollUpper, lineStyle: { width: 1.0, color: '#b388ff' }, symbol: 'none', smooth: true, areaStyle: { color: 'rgba(179,136,255,0.06)', origin: 'start' } },
            { name: 'LOWER', type: 'line', data: bollLower, lineStyle: { width: 1.0, color: '#00d4ff' }, symbol: 'none', smooth: true }
          ]
        };
        const lastClose = closesView[closesView.length - 1];
        let bollState = '';
        if (curBollUp != null && curBollLow != null && curBollUp > curBollLow) {
          const pct = (lastClose - curBollLow) / (curBollUp - curBollLow) * 100;
          const width = ((curBollUp - curBollLow) / curBollMid * 100).toFixed(1);
          if (lastClose >= curBollUp) bollState = `⚠️ 突破上轨，超强势但警惕回调 | 带宽${width}%`;
          else if (pct > 70) bollState = `🔴 上轨附近运行，偏强但有压力 | 带宽${width}%`;
          else if (lastClose <= curBollLow) bollState = `⚠️ 跌破下轨，超弱势但可能反弹 | 带宽${width}%`;
          else if (pct < 30) bollState = `🟢 下轨附近运行，偏弱关注支撑 | 带宽${width}%`;
          else bollState = `⚖️ 中轨附近震荡 | 带宽${width}%`;
        } else bollState = '数据不足';
        infoEl.textContent = `BOLL(20,2) | UP: ${curBollUp!=null?curBollUp.toFixed(2):'--'} | MID: ${curBollMid!=null?curBollMid.toFixed(2):'--'} | LOW: ${curBollLow!=null?curBollLow.toFixed(2):'--'} | ${bollState}`;
      } else if (tab === 'vol') {
        const volColors = data.slice(-VIEW).map(k => k.close >= k.open ? 'rgba(255,71,87,0.6)' : 'rgba(0,230,118,0.6)');
        option = {
          backgroundColor: 'transparent',
          grid: baseGrid,
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(26,31,46,0.9)', borderColor: '#00d4ff', textStyle: { color: '#fff', fontSize: 11 } },
          xAxis: baseXAxis,
          yAxis: { ...baseYAxis, axisLabel: { formatter: (v) => (v/10000).toFixed(0) + '万' } },
          series: [
            { name: '成交量', type: 'bar', data: volumes.map((v, i) => ({ value: v, itemStyle: { color: volColors[i] } })), barWidth: '60%' },
            { name: 'MA5均量', type: 'line', data: ma5vol, lineStyle: { width: 1.5, color: '#ffa500' }, symbol: 'none', smooth: true }
          ]
        };
        const validVol = volumes.filter(v => v != null);
        const avgVol = validVol.slice(-5).reduce((a,b)=>a+b,0) / Math.min(5, validVol.slice(-5).length || 1);
        const prev = validVol.slice(-10, -5);
        const prevAvgVol = prev.length > 0 ? prev.reduce((a,b)=>a+b,0) / prev.length : avgVol;
        const volChange = prevAvgVol > 0 ? ((avgVol - prevAvgVol) / prevAvgVol * 100) : 0;
        const volState = volChange > 30 ? '🔥 显著放量' : volChange > 10 ? '📈 温和放量' : volChange < -30 ? '📉 明显缩量' : volChange < -10 ? '⬇️ 温和缩量' : '⚖️ 量能平稳';
        infoEl.textContent = `近5日均量: ${(avgVol/10000).toFixed(0)}万手 | 较前5日: ${volChange > 0 ? '+' : ''}${volChange.toFixed(1)}% | ${volState}`;
      }
      this.techChart.setOption(option, true);
    };

    renderChart(currentTab);

    // Tab切换事件
    document.querySelectorAll('.tech-tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tech-tab').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.color = '#8a8e9b';
          b.classList.remove('active');
        });
        btn.style.background = 'rgba(0,212,255,0.15)';
        btn.style.borderColor = 'rgba(0,212,255,0.3)';
        btn.style.color = '#00d4ff';
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        renderChart(currentTab);
      };
    });
  },

  /** 渲染风险预警 */
  renderRiskWarning(quote, klines) {
    const alerts = [];
    const closes = klines.map(k => k.close);
    const volumes = klines.map(k => k.volume);
    const changes = klines.map(k => k.changePct || 0);

    // === 风险1: 连续跌停检测 ===
    let consecutiveLimitDown = 0;
    for (let i = klines.length - 1; i >= Math.max(0, klines.length - 10); i--) {
      if (klines[i].changePct <= -9.5) consecutiveLimitDown++;
      else break;
    }
    if (consecutiveLimitDown >= 2) {
      alerts.push({ level: 'critical', icon: '🔴', title: '连续跌停', desc: `连续${consecutiveLimitDown}个交易日跌停，流动性极差，切勿抄底` });
    } else if (consecutiveLimitDown === 1) {
      alerts.push({ level: 'warning', icon: '🟠', title: '今日跌停', desc: '当日跌停封板，明日存在继续低开风险' });
    }

    // === 风险2: 异常换手率 ===
    if (quote.turnover > 20) {
      alerts.push({ level: 'critical', icon: '🔴', title: '异常换手率', desc: `换手率${quote.turnover.toFixed(1)}%远超正常水平，可能是游资对倒或主力出货，风险极高` });
    } else if (quote.turnover > 12) {
      alerts.push({ level: 'warning', icon: '🟠', title: '换手率偏高', desc: `换手率${quote.turnover.toFixed(1)}%处于高位，筹码松动，注意控制仓位` });
    }

    // === 风险3: RSI极端值 ===
    if (closes.length >= 15) {
      const rsi = Utils.calcRSI(closes, 14);
      if (rsi >= 85) {
        alerts.push({ level: 'critical', icon: '🔴', title: 'RSI极度超买', desc: `RSI(14)=${rsi.toFixed(1)}，处于极度超买区域，短期回调概率极高` });
      } else if (rsi >= 75) {
        alerts.push({ level: 'warning', icon: '🟠', title: 'RSI超买', desc: `RSI(14)=${rsi.toFixed(1)}，已进入超买区域，追高风险加大` });
      } else if (rsi <= 15) {
        alerts.push({ level: 'warning', icon: '🟡', title: 'RSI极度超卖', desc: `RSI(14)=${rsi.toFixed(1)}，极度超卖但可能是基本面恶化，不宜盲目抄底` });
      }
    }

    // === 风险4: 跌破关键支撑位 ===
    if (klines.length >= 20) {
      const sr = Utils.calcSupportResistance(klines);
      const current = quote.price;
      if (sr.support && current < sr.support) {
        const breakPct = ((current - sr.support) / sr.support * 100).toFixed(1);
        alerts.push({ level: 'critical', icon: '🔴', title: '跌破支撑位', desc: `当前价${current.toFixed(2)}已跌破关键支撑${sr.support.toFixed(2)}，跌幅${breakPct}%，下方缺乏有效支撑` });
      }
    }

    // === 风险5: 放量下跌 ===
    if (klines.length >= 5) {
      const recent3 = klines.slice(-3);
      const avgVol3 = recent3.reduce((s, k) => s + k.volume, 0) / 3;
      const prevVol5 = klines.slice(-8, -3);
      const avgVolPrev = prevVol5.length > 0 ? prevVol5.reduce((s, k) => s + k.volume, 0) / prevVol5.length : avgVol3;
      const isDown3 = recent3.every(k => k.close < k.open);
      if (isDown3 && avgVol3 > avgVolPrev * 1.5) {
        alerts.push({ level: 'critical', icon: '🔴', title: '放量连续下跌', desc: '近3日持续下跌且成交量显著放大，空方力量集中释放，短期不宜介入' });
      }
    }

    // === 风险6: 高位长上影线 ===
    if (klines.length >= 20) {
      const last = klines[klines.length - 1];
      const body = Math.abs(last.close - last.open);
      const upperShadow = last.high - Math.max(last.close, last.open);
      const high20 = Math.max(...klines.slice(-20).map(k => k.high));
      const isNearHigh = last.high >= high20 * 0.97;
      if (upperShadow > body * 2 && isNearHigh && body > 0) {
        alerts.push({ level: 'warning', icon: '🟠', title: '高位长上影线', desc: '股价触及近期高点后大幅回落，上方抛压沉重，短线见顶信号' });
      }
    }

    // === 风险7: MA5跌破MA20（死叉）===
    if (closes.length >= 20) {
      const ma5 = closes.slice(-5).reduce((a,b) => a+b, 0) / 5;
      const ma20 = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;
      const prevCloses = closes.slice(0, -1);
      if (prevCloses.length >= 20) {
        const prevMa5 = prevCloses.slice(-5).reduce((a,b) => a+b, 0) / 5;
        const prevMa20 = prevCloses.slice(-20).reduce((a,b) => a+b, 0) / 20;
        if (prevMa5 >= prevMa20 && ma5 < ma20) {
          alerts.push({ level: 'warning', icon: '🟠', title: '均线死叉', desc: 'MA5下穿MA20形成死叉，短期趋势转弱' });
        }
      }
    }

    // 渲染
    if (alerts.length === 0) {
      this.showSection('riskAlertCard', false);
      return;
    }

    this.showSection('riskAlertCard', true);
    const levelColors = { critical: '#ff4757', warning: '#ffa502', info: '#ffc312' };
    const levelBg = { critical: 'rgba(255,71,87,0.08)', warning: 'rgba(255,165,2,0.08)', info: 'rgba(255,195,18,0.08)' };
    const html = alerts.map(a => `
      <div style="background:${levelBg[a.level]};border-left:3px solid ${levelColors[a.level]};border-radius:6px;padding:10px 12px;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600;color:${levelColors[a.level]}">${a.icon} ${a.title}</div>
        <div style="font-size:11px;color:#a0a4b0;margin-top:4px;line-height:1.5">${a.desc}</div>
      </div>
    `).join('');
    document.getElementById('riskAlertContent').innerHTML = html;
  },

  /** 渲染诊断报告 */
  renderDiagnostic(report) {
    this.showSection('diagnosticResult', true);
    // 模块1-4和6-7是HTML字符串（模块8已合并到模块6，不再单独显示）
    const htmlModules = { 1: report.mod1, 2: report.mod2, 3: report.mod3, 4: report.mod4, 6: report.mod6, 7: report.mod7 };
    Object.entries(htmlModules).forEach(([num, html]) => {
      document.getElementById(`diagMod${num}`).style.display = '';
      document.getElementById(`mod${num}Content`).innerHTML = html;
    });
    // 隐藏模块8（内容已并入模块6）
    document.getElementById('diagMod8').style.display = 'none';
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
// 13. Auth - 授权登录模块（v2.9 激活码门控）
// ============================================================
const Auth = {
  STORAGE_KEY: 'zhigu_auth',
  SESSION_KEY: 'zhigu_session',
  RATE_LIMIT_KEY: 'zhigu_rl',
  SESSION_DURATION: 7 * 24 * 60 * 60 * 1000,   // 7天
  SHORT_SESSION: 24 * 60 * 60 * 1000,          // 24小时（未勾选记住）
  ACT_CODE_HASH: 'h1_ntr9g0_14',               // 授权码哈希（原始码由主人分发）
  ACT_CODE_VERSION: '20260823',                // 授权版本（换码时更新，旧激活自动失效）
  MAX_ATTEMPTS: 5,                              // 最大失败次数
  LOCK_DURATION: 15 * 60 * 1000,                // 锁定15分钟

  /** 简单hash（用于密码/授权码存储，非安全加密） */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h1_' + Math.abs(hash).toString(36) + '_' + str.length;
  },

  /** 获取授权数据 */
  _getAuth() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // v2.9安全迁移：无codeVersion或版本不匹配，一律视为未授权，需重新激活
        if (!parsed.codeVersion || parsed.codeVersion !== this.ACT_CODE_VERSION) {
          return null;
        }
        return parsed;
      }
    } catch(e) {}
    return null;
  },

  /** 保存授权数据 */
  _saveAuth(auth) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(auth));
  },

  /** 获取登录限速记录 */
  _getRateLimit() {
    try {
      const data = localStorage.getItem(this.RATE_LIMIT_KEY);
      if (data) return JSON.parse(data);
    } catch(e) {}
    return { attempts: 0, lockUntil: 0 };
  },

  _saveRateLimit(rl) {
    localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(rl));
  },

  _clearRateLimit() {
    localStorage.removeItem(this.RATE_LIMIT_KEY);
  },

  /** 检查是否被锁定 */
  _isLocked() {
    const rl = this._getRateLimit();
    if (rl.lockUntil && rl.lockUntil > Date.now()) {
      const mins = Math.ceil((rl.lockUntil - Date.now()) / 60000);
      return { locked: true, minutes: mins };
    }
    if (rl.lockUntil && rl.lockUntil <= Date.now()) {
      this._clearRateLimit(); // 锁定期过，清除
    }
    return { locked: false };
  },

  _recordFailedAttempt() {
    const rl = this._getRateLimit();
    rl.attempts = (rl.attempts || 0) + 1;
    if (rl.attempts >= this.MAX_ATTEMPTS) {
      rl.lockUntil = Date.now() + this.LOCK_DURATION;
      rl.attempts = 0;
    }
    this._saveRateLimit(rl);
    return rl;
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
      expires: remember ? Date.now() + this.SESSION_DURATION : Date.now() + this.SHORT_SESSION
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  /** 验证激活码 */
  _verifyActCode(code) {
    const normalized = (code || '').trim().toUpperCase().replace(/\s+/g, '');
    return this._hash(normalized) === this.ACT_CODE_HASH;
  },

  /** 验证密码 */
  _verifyPassword(phone, password) {
    const auth = this._getAuth();
    if (!auth || !auth.users) return false;
    const hashedPwd = this._hash(password);
    const user = auth.users.find(u => u.phone === phone);
    return !!(user && user.password === hashedPwd);
  },

  /** 检查是否已登录且授权有效 */
  isLoggedIn() {
    const session = this._getSession();
    if (!session) return false;
    // 授权数据必须存在且版本匹配
    const auth = this._getAuth();
    if (!auth || !auth.users) return false;
    // 用户必须仍在授权列表中
    return !!auth.users.find(u => u.phone === session.phone);
  },

  /** 获取当前登录手机号 */
  getCurrentUser() {
    const session = this._getSession();
    return session ? session.phone : null;
  },

  /** 显示UI */
  _showApp() {
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('app-header').style.display = '';
    document.getElementById('app-content').style.display = '';
    document.getElementById('app-nav').style.display = '';
  },

  _showLoginPage() {
    document.getElementById('page-login').style.display = 'flex';
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('app-nav').style.display = 'none';
  },

  /** 切换到激活表单 */
  showActivate() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('activateForm').style.display = 'block';
    const err = document.getElementById('actError');
    if (err) err.style.display = 'none';
  },

  /** 切换到登录表单 */
  showLogin() {
    document.getElementById('activateForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    const err = document.getElementById('loginError');
    if (err) err.style.display = 'none';
  },

  /** 初始化：检查登录状态 */
  init() {
    if (this.isLoggedIn()) {
      this._showApp();
    } else {
      // 清除过期session
      localStorage.removeItem(this.SESSION_KEY);
      this._showLoginPage();
      // 如果没有任何授权记录，直接显示激活表单
      const auth = this._getAuth();
      if (!auth || !auth.users || auth.users.length === 0) {
        this.showActivate();
      }
    }
  },

  /** 处理激活 */
  handleActivate(event) {
    event.preventDefault();
    const code = document.getElementById('actCode').value;
    const phone = document.getElementById('actPhone').value.trim();
    const password = document.getElementById('actPassword').value;
    const confirm = document.getElementById('actConfirm').value;
    const errorEl = document.getElementById('actError');

    const showErr = (msg) => {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    };

    // 限速检查
    const lockCheck = this._isLocked();
    if (lockCheck.locked) {
      showErr('尝试次数过多，请' + lockCheck.minutes + '分钟后再试');
      return false;
    }

    // 验证激活码
    if (!this._verifyActCode(code)) {
      this._recordFailedAttempt();
      showErr('授权码无效，请确认后重新输入');
      return false;
    }

    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showErr('请输入正确的11位手机号');
      return false;
    }

    // 验证密码
    if (password.length < 6) {
      showErr('密码至少6位');
      return false;
    }
    if (password !== confirm) {
      showErr('两次输入的密码不一致');
      return false;
    }

    // 检查是否已有该用户
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
    return false;
  },

  /** 处理登录 */
  handleLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('loginRemember').checked;
    const errorEl = document.getElementById('loginError');

    const showErr = (msg) => {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    };

    // 限速检查
    const lockCheck = this._isLocked();
    if (lockCheck.locked) {
      showErr('登录失败次数过多，请' + lockCheck.minutes + '分钟后再试');
      return false;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this._recordFailedAttempt();
      showErr('请输入正确的11位手机号');
      return false;
    }

    // 检查授权是否存在
    const auth = this._getAuth();
    if (!auth || !auth.users) {
      this._recordFailedAttempt();
      showErr('设备未激活，请先输入授权码激活');
      return false;
    }

    // 验证密码
    if (this._verifyPassword(phone, password)) {
      this._saveSession(phone, remember);
      this._clearRateLimit();
      errorEl.style.display = 'none';
      this._showApp();
      App.init();
    } else {
      this._recordFailedAttempt();
      const rl = this._getRateLimit();
      const remaining = this.MAX_ATTEMPTS - (rl.attempts || 0);
      showErr(remaining > 0 ? '手机号或密码错误，还可尝试' + remaining + '次' : '账号已锁定，请15分钟后再试');
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
    }
    return false;
  },

  /** 退出登录 */
  logout() {
    if (!confirm('确定退出登录？')) return;
    localStorage.removeItem(this.SESSION_KEY);
    location.reload();
  },

  /** 显示管理面板 */
  showAdmin() {
    const code = document.getElementById('adminCode').value;
    if (!this._verifyActCode(code)) {
      alert('授权码错误');
      return;
    }
    document.getElementById('adminEntry').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    this._renderAdminList();
  },

  hideAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminEntry').style.display = 'block';
    document.getElementById('adminCode').value = '';
  },

  _renderAdminList() {
    const auth = this._getAuth();
    const currentUser = this.getCurrentUser();
    const container = document.getElementById('adminUserList');
    if (!container || !auth || !auth.users) return;

    container.innerHTML = auth.users.map(u => {
      const d = u.activatedAt ? new Date(u.activatedAt) : null;
      const dateStr = d ? (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')) : '未知';
      return '<div class="phone-item">' +
        '<span>📱 ' + u.phone + ' ' + (u.phone === currentUser ? '<span class="phone-tag">(当前)</span>' : '') +
        '<br><small style="color:var(--text-muted)">激活：' + dateStr + '</small></span>' +
        (u.phone !== currentUser ? '<button class="del-btn" onclick="Auth.revokeUser(\'' + u.phone + '\')">撤销授权</button>' : '') +
        '</div>';
    }).join('');
  },

  /** 撤销某用户授权（仅本设备） */
  revokeUser(phone) {
    if (!confirm('确定撤销 ' + phone + ' 的授权？\n该用户在本设备下次启动时需重新激活。')) return;
    const auth = this._getAuth();
    if (!auth) return;
    auth.users = auth.users.filter(u => u.phone !== phone);
    this._saveAuth(auth);
    this._renderAdminList();
  },

  /** 设置页面初始化 */
  initSettingsPage() {
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
  }
};

// ============================================================
// 离线/网络状态检测
// ============================================================
const NetworkStatus = {
  banner: null,
  init() {
    this.banner = document.getElementById('offlineBanner');
    window.addEventListener('online', () => this.update(true));
    window.addEventListener('offline', () => this.update(false));
    this.update(navigator.onLine);
  },
  update(isOnline) {
    if (!this.banner) return;
    if (!isOnline) {
      this.banner.textContent = '⚠️ 当前网络不可用，显示缓存数据（行情可能延迟）';
      this.banner.style.display = 'block';
      document.body.style.paddingTop = '40px';
    } else {
      this.banner.style.display = 'none';
      document.body.style.paddingTop = '';
    }
  },
  /** 显示数据过期提示（SW返回了stale缓存） */
  showStale(age) {
    if (!this.banner || !navigator.onLine) return;
    const mins = Math.round(age / 60000);
    if (mins < 1) return;
    this.banner.textContent = `📡 数据已过期 ${mins} 分钟，正在刷新…`;
    this.banner.style.display = 'block';
    document.body.style.paddingTop = '40px';
    setTimeout(() => {
      if (navigator.onLine) {
        this.banner.style.display = 'none';
        document.body.style.paddingTop = '';
      }
    }, 3000);
  }
};

// ============================================================
// 应用启动（带登录检查）
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 初始化网络状态检测
  NetworkStatus.init();
  // 先初始化登录检查
  Auth.init();
  
  // 如果已登录，初始化APP
  if (Auth.isLoggedIn()) {
    App.init();
  }
});
