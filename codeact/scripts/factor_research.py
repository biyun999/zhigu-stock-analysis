#!/usr/bin/env python3
"""
v4.4 P8 因子增强研究脚本
利用 stock-data-skill 拉取20-30只典型股票的多维数据，
分析各因子对次日涨跌的区分度（IC值），为前端六维模型增强提供依据。

研究方法：
1. 选取近期（近20个交易日）有代表性的股票（上涨/下跌/震荡各占一定比例）
2. 对T日数据计算各因子值，看T+1日涨跌方向
3. 计算每个因子的信息系数(IC)：因子值与次日收益率的相关系数
4. 分析各因子在不同市场环境下的区分度
"""

import json
import os
import sys
import subprocess
from datetime import datetime, timedelta
import statistics

SKILL_DIR = "/app/data/所有对话/主对话/.skills/skill_stock-data-skill"
OUTPUT_DIR = "/app/data/所有对话/主对话/智股分析/codeact/output"

# 选取的研究标的：涵盖不同行业、不同市值、不同走势的20只典型A股
STOCKS = [
    # 大金融/消费龙头
    "sh600519",  # 贵州茅台 - 消费龙头
    "sz000001",  # 平安银行 - 银行
    "sh601318",  # 中国平安 - 保险
    "sz000858",  # 五粮液 - 白酒
    # 科技成长
    "sz300750",  # 宁德时代 - 新能源
    "sz002594",  # 比亚迪 - 新能源汽车
    "sh600036",  # 招商银行 - 银行
    # 医药
    "sh600276",  # 恒瑞医药
    "sz300760",  # 迈瑞医疗
    # 周期/制造
    "sh601899",  # 紫金矿业 - 有色
    "sz002475",  # 立讯精密 - 消费电子
    # 中小盘活跃股
    "sz002230",  # 科大讯飞 - AI
    "sz000333",  # 美的集团 - 家电
    # 券商
    "sz300059",  # 东方财富 - 券商
    "sh600030",  # 中信证券 - 券商
    # 其他
    "sz002415",  # 海康威视 - 安防
    "sh601398",  # 工商银行 - 大行
    "sz300015",  # 爱尔眼科
    "sz000651",  # 格力电器 - 家电
    "sh600900",  # 长江电力 - 公用事业
]

def run_skill(op, **params):
    """调用stock-data-skill CLI"""
    cmd = ["python3", "bin/_cli_wrapper.py", "call", op]
    for k, v in params.items():
        cmd.append(f"--param")
        cmd.append(f"{k}={v}")
    try:
        result = subprocess.run(
            cmd, cwd=SKILL_DIR, capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"  [WARN] {op} error: {result.stderr.strip()[:200]}")
            return None
    except Exception as e:
        print(f"  [ERROR] {op} exception: {e}")
        return None

def parse_md_table(md_text):
    """解析markdown表格为字典列表"""
    if not md_text or '---' not in md_text:
        return []
    lines = md_text.strip().split('\n')
    # 找到分隔线（---行），其上一行就是表头
    sep_idx = None
    for i, line in enumerate(lines):
        if '---' in line and line.strip().startswith('|'):
            sep_idx = i
            break
    if sep_idx is None or sep_idx < 1:
        return []
    header_idx = sep_idx - 1
    
    headers = [h.strip() for h in lines[header_idx].split('|')[1:-1]]
    rows = []
    for line in lines[sep_idx+1:]:
        if not line.strip().startswith('|'):
            continue
        cells = [c.strip() for c in line.split('|')[1:-1]]
        if len(cells) == len(headers):
            row = {}
            for h, c in zip(headers, cells):
                # 尝试转为数字
                try:
                    row[h] = float(c)
                except (ValueError, TypeError):
                    row[h] = c
            rows.append(row)
    return rows

def parse_json_output(text):
    """尝试解析JSON输出"""
    if not text:
        return None
    text = text.strip()
    if text.startswith('{') or text.startswith('['):
        try:
            return json.loads(text)
        except:
            pass
    return None

def get_technical_data(code, start_date, end_date):
    """获取技术指标数据（多日）"""
    result = run_skill("technical", code=code, start=start_date, end=end_date)
    if result and '---' in result and '|' in result:
        return parse_md_table(result)
    return []

def get_kline_data(code, start_date, end_date):
    """获取K线数据"""
    # 使用kline_v2，代码格式为 symbol.MIC
    if code.startswith('sh'):
        sym = code[2:] + '.XSHG'
    elif code.startswith('sz'):
        sym = code[2:] + '.XSHE'
    else:
        return []
    result = run_skill("kline_v2", code=sym, startdate=start_date, enddate=end_date)
    data = parse_json_output(result)
    if data and isinstance(data, list):
        return data
    return []

def get_chip_data(code):
    """获取筹码分布数据（最新）"""
    result = run_skill("chip", code=code)
    if result and '---' in result and '|' in result:
        rows = parse_md_table(result)
        if rows:
            return rows[0]
    return None

def get_asfund_data(code):
    """获取资金流向数据（最新）"""
    result = run_skill("asfund", code=code)
    if result and '---' in result and '|' in result:
        rows = parse_md_table(result)
        if rows:
            return rows[0]
    return None

def get_lhb_data(code):
    """获取龙虎榜数据"""
    result = run_skill("lhb", code=code)
    if result and '---' in result and '|' in result:
        return parse_md_table(result)
    return []

def get_blocktrade_data(code):
    """获取大宗交易数据"""
    result = run_skill("blocktrade", code=code)
    if result and '---' in result and '|' in result:
        return parse_md_table(result)
    return []

def compute_ic(factor_values, return_values):
    """计算信息系数IC（Pearson相关系数）"""
    if len(factor_values) < 3 or len(factor_values) != len(return_values):
        return 0
    try:
        return statistics.correlation(factor_values, return_values)
    except:
        return 0

def rank_ic(factor_values, return_values):
    """计算秩相关系数（Spearman）"""
    if len(factor_values) < 3 or len(factor_values) != len(return_values):
        return 0
    n = len(factor_values)
    # 计算排名
    def rank(vals):
        indexed = sorted(enumerate(vals), key=lambda x: x[1])
        ranks = [0] * n
        for rank_idx, (orig_idx, _) in enumerate(indexed):
            ranks[orig_idx] = rank_idx
        return ranks
    f_ranks = rank(factor_values)
    r_ranks = rank(return_values)
    try:
        return statistics.correlation(f_ranks, r_ranks)
    except:
        return 0

def main():
    print("=" * 70)
    print("v4.4 P8 因子增强研究 - 六维模型因子IC分析")
    print("=" * 70)
    
    # 日期范围：近40个交易日（约2个月）
    end_date = "2026-09-14"
    start_date = "2026-07-15"
    
    # 存储所有股票每天的因子和次日收益
    all_samples = []  # [{code, date, factors: {...}, next_return: ...}]
    chip_samples = []  # 筹码因子样本（只有最新一日，单独分析）
    
    print(f"\n研究区间: {start_date} ~ {end_date}")
    print(f"研究标的: {len(STOCKS)}只A股")
    print()
    
    for idx, code in enumerate(STOCKS):
        print(f"[{idx+1}/{len(STOCKS)}] 处理 {code} ...")
        
        # 1. 获取技术指标数据（每日）
        tech_data = get_technical_data(code, start_date, end_date)
        if not tech_data or len(tech_data) < 5:
            print(f"  技术指标数据不足，跳过")
            continue
        
        print(f"  技术指标数据: {len(tech_data)}天")
        
        # 2. 对每一天计算因子和次日收益
        for i in range(len(tech_data) - 1):
            today = tech_data[i]
            next_day = tech_data[i + 1]
            
            today_close = today.get('closePrice') or today.get('close') or 0
            next_close = next_day.get('closePrice') or next_day.get('close') or 0
            
            if not today_close or not next_close or today_close <= 0:
                continue
            
            next_return = (next_close - today_close) / today_close * 100  # 百分比
            
            # 提取当日因子
            factors = {}
            
            # --- 趋势类因子 ---
            # MA排列：MA5>MA10>MA20为多头
            ma5 = today.get('ma.MA_5', 0)
            ma10 = today.get('ma.MA_10', 0)
            ma20 = today.get('ma.MA_20', 0)
            ma60 = today.get('ma.MA_60', 0)
            
            if ma5 and ma10 and ma20:
                factors['ma_bullish'] = 1 if (ma5 > ma10 > ma20) else 0
                factors['ma_bearish'] = 1 if (ma5 < ma10 < ma20) else 0
                # 20日乖离率
                factors['bias20'] = (today_close - ma20) / ma20 * 100 if ma20 else 0
            
            if ma60:
                factors['price_above_ma60'] = 1 if today_close > ma60 else 0
                factors['ma20_above_ma60'] = 1 if (ma20 and ma20 > ma60) else 0
            
            # --- MACD因子 ---
            dif = today.get('macd.DIF', 0)
            dea = today.get('macd.DEA', 0)
            macd_val = today.get('macd.MACD', 0)
            if dif is not None and dea is not None:
                factors['macd_golden'] = 1 if (dif > dea) else 0
                factors['macd_above_zero'] = 1 if (dif > 0 and dea > 0) else 0
                # MACD柱变化（需要前一日）
                if i > 0:
                    prev_macd = tech_data[i-1].get('macd.MACD', 0)
                    factors['macd_expanding'] = 1 if (macd_val > 0 and macd_val > prev_macd) else 0
            
            # --- KDJ因子 ---
            kdj_k = today.get('kdj.KDJ_K', 50)
            kdj_d = today.get('kdj.KDJ_D', 50)
            kdj_j = today.get('kdj.KDJ_J', 50)
            if kdj_k is not None and kdj_d is not None:
                factors['kdj_golden'] = 1 if (kdj_k > kdj_d) else 0
                factors['kdj_overbought'] = 1 if (kdj_j > 100) else 0
                factors['kdj_oversold'] = 1 if (kdj_j < 0) else 0
                factors['kdj_strength'] = 1 if (50 < kdj_k < 80 and kdj_k > kdj_d) else 0
            
            # --- RSI因子 ---
            rsi6 = today.get('rsi.RSI_6', 50)
            rsi12 = today.get('rsi.RSI_12', 50)
            if rsi6 is not None:
                factors['rsi6_strength'] = 1 if (50 < rsi6 < 80) else 0
                factors['rsi6_overbought'] = 1 if (rsi6 > 85) else 0
                factors['rsi6_oversold'] = 1 if (rsi6 < 30) else 0
            
            # --- BOLL因子 ---
            boll_upper = today.get('boll.BOLL_UPPER', 0)
            boll_mid = today.get('boll.BOLL_MID', 0)
            boll_lower = today.get('boll.BOLL_LOWER', 0)
            if boll_upper and boll_mid and boll_lower and boll_upper != boll_lower:
                # 布林带位置（0=下轨, 1=上轨）
                boll_pos = (today_close - boll_lower) / (boll_upper - boll_lower)
                factors['boll_position'] = boll_pos
                factors['boll_upper_half'] = 1 if (today_close > boll_mid) else 0
                factors['boll_break_upper'] = 1 if (today_close > boll_upper) else 0
                factors['boll_near_lower'] = 1 if (today_close < boll_lower * 1.02) else 0
                # 布林带宽度（波动率）
                factors['boll_width'] = (boll_upper - boll_lower) / boll_mid * 100 if boll_mid else 0
            
            # --- DMI趋势强度因子 ---
            pdi = today.get('dmi.PDI', 0)
            mdi = today.get('dmi.MDI', 0)
            adx = today.get('dmi.ADX', 0)
            if pdi is not None and mdi is not None:
                factors['dmi_trend_up'] = 1 if (pdi > mdi) else 0
                factors['dmi_pdi_mdi_diff'] = pdi - mdi
            if adx is not None:
                factors['dmi_adx_strength'] = adx  # ADX>25为强趋势
                factors['dmi_strong_trend'] = 1 if (adx > 25 and pdi > mdi) else 0
            
            # --- CCI因子 ---
            cci = today.get('other.CCI_14', 0)
            if cci is not None:
                factors['cci_positive'] = 1 if (cci > 0) else 0
                factors['cci_strong'] = 1 if (cci > 100) else 0
                factors['cci_weak'] = 1 if (cci < -100) else 0
            
            # --- BIAS乖离率因子 ---
            bias6 = today.get('bias.BIAS_6', 0)
            bias12 = today.get('bias.BIAS_12', 0)
            if bias6 is not None:
                factors['bias6'] = bias6
                factors['bias_extreme_high'] = 1 if (bias6 > 8) else 0
                factors['bias_extreme_low'] = 1 if (bias6 < -8) else 0
            
            # --- WR威廉指标 ---
            wr6 = today.get('wr.WR_6', -50)
            if wr6 is not None:
                factors['wr6'] = wr6
                factors['wr_oversold'] = 1 if (wr6 < -80) else 0  # 超卖
                factors['wr_overbought'] = 1 if (wr6 > -20) else 0  # 超买
            
            # --- VR成交量变异率 ---
            vr = today.get('other.VR', 100)
            if vr is not None:
                factors['vr'] = vr
                factors['vr_strong'] = 1 if (vr > 160) else 0
                factors['vr_weak'] = 1 if (vr < 70) else 0
            
            # --- PSY心理线 ---
            psy = today.get('other.PSY', 50)
            if psy is not None:
                factors['psy'] = psy
                factors['psy_high'] = 1 if (psy > 75) else 0
                factors['psy_low'] = 1 if (psy < 25) else 0
            
            sample = {
                'code': code,
                'date': today.get('date', ''),
                'close': today_close,
                'next_return': next_return,
                'next_up': 1 if next_return > 0 else 0,
                'factors': factors
            }
            all_samples.append(sample)
    
    print(f"\n总样本数: {len(all_samples)}")
    
    # --- 计算各因子的IC值 ---
    print("\n" + "=" * 70)
    print("因子IC分析（信息系数，基于Pearson相关）")
    print("=" * 70)
    
    if not all_samples:
        print("无样本数据，分析失败")
        return
    
    # 收集所有因子名
    factor_names = set()
    for s in all_samples:
        factor_names.update(s['factors'].keys())
    factor_names = sorted(factor_names)
    
    ic_results = []
    for fname in factor_names:
        f_vals = []
        r_vals = []
        up_ratios = {0: [], 1: []}  # 按因子值分组的上涨比例
        
        for s in all_samples:
            if fname in s['factors'] and s['factors'][fname] is not None:
                v = s['factors'][fname]
                if isinstance(v, (int, float)) and not (v != v):  # not NaN
                    f_vals.append(v)
                    r_vals.append(s['next_return'])
        
        if len(f_vals) >= 10:
            ic = compute_ic(f_vals, r_vals)
            ric = rank_ic(f_vals, r_vals)
            
            # 计算分位数收益差（top 30% vs bottom 30%）
            n = len(f_vals)
            indexed = sorted(zip(f_vals, r_vals), key=lambda x: x[0])
            bottom_n = max(1, n // 3)
            top_n = max(1, n // 3)
            bottom_ret = statistics.mean([x[1] for x in indexed[:bottom_n]])
            top_ret = statistics.mean([x[1] for x in indexed[-top_n:]])
            ret_diff = top_ret - bottom_ret
            
            # 上涨命中率（top 30%样本的上涨比例）
            top_up_ratio = sum(1 for x in indexed[-top_n:] if x[1] > 0) / top_n * 100
            bottom_up_ratio = sum(1 for x in indexed[:bottom_n] if x[1] > 0) / bottom_n * 100
            
            ic_results.append({
                'factor': fname,
                'ic': ic,
                'rank_ic': ric,
                'top_ret': top_ret,
                'bottom_ret': bottom_ret,
                'ret_diff': ret_diff,
                'top_up_ratio': top_up_ratio,
                'bottom_up_ratio': bottom_up_ratio,
                'up_ratio_diff': top_up_ratio - bottom_up_ratio,
                'sample_count': n
            })
    
    # 按IC绝对值排序
    ic_results.sort(key=lambda x: abs(x['ic']), reverse=True)
    
    print(f"{'因子名':<25} {'IC':>8} {'RankIC':>8} {'Top收益':>8} {'Bot收益':>8} {'收益差':>8} {'Top胜率':>8} {'Bot胜率':>8} {'胜率差':>8} {'样本数':>6}")
    print("-" * 100)
    for r in ic_results[:40]:
        print(f"{r['factor']:<25} {r['ic']:>8.3f} {r['rank_ic']:>8.3f} "
              f"{r['top_ret']:>8.3f} {r['bottom_ret']:>8.3f} {r['ret_diff']:>8.3f} "
              f"{r['top_up_ratio']:>7.1f}% {r['bottom_up_ratio']:>7.1f}% {r['up_ratio_diff']:>7.1f}% "
              f"{r['sample_count']:>6}")
    
    # --- 分维度统计 ---
    print("\n" + "=" * 70)
    print("按维度汇总因子强度")
    print("=" * 70)
    
    dim_map = {
        '趋势/均线': ['ma_bullish', 'ma_bearish', 'price_above_ma60', 'ma20_above_ma60', 'bias20', 'bias6'],
        'MACD': ['macd_golden', 'macd_above_zero', 'macd_expanding'],
        'KDJ': ['kdj_golden', 'kdj_strength', 'kdj_overbought', 'kdj_oversold'],
        'RSI': ['rsi6_strength', 'rsi6_overbought', 'rsi6_oversold'],
        'BOLL': ['boll_position', 'boll_upper_half', 'boll_break_upper', 'boll_near_lower', 'boll_width'],
        'DMI趋势': ['dmi_trend_up', 'dmi_pdi_mdi_diff', 'dmi_adx_strength', 'dmi_strong_trend'],
        'CCI': ['cci_positive', 'cci_strong', 'cci_weak'],
        'BIAS': ['bias6', 'bias_extreme_high', 'bias_extreme_low'],
        'WR': ['wr6', 'wr_overbought', 'wr_oversold'],
        'VR/量能': ['vr', 'vr_strong', 'vr_weak'],
        'PSY情绪': ['psy', 'psy_high', 'psy_low'],
    }
    
    for dim, dim_factors in dim_map.items():
        dim_ics = [r['ic'] for r in ic_results if r['factor'] in dim_factors]
        dim_updiffs = [r['up_ratio_diff'] for r in ic_results if r['factor'] in dim_factors]
        if dim_ics:
            avg_ic = statistics.mean(dim_ics)
            max_abs_ic = max(dim_ics, key=abs)
            avg_updiff = statistics.mean(dim_updiffs)
            print(f"  {dim:<12}: 平均IC={avg_ic:+.3f} 最强IC={max_abs_ic:+.3f} 平均胜率差={avg_updiff:+.1f}%")
    
    # --- 筹码因子单独分析 ---
    print("\n" + "=" * 70)
    print("筹码因子横截面分析（最新日期）")
    print("=" * 70)
    
    chip_results = []
    for code in STOCKS:
        chip = get_chip_data(code)
        quote_raw = run_skill("quote", code=code)
        quote = parse_json_output(quote_raw)
        
        if chip and quote and quote.get('close'):
            # 用近5日涨跌幅代替"次日涨跌"做横截面相关
            # （筹码是截面数据，我们看不同股票筹码结构与短期表现的关系）
            chip_results.append({
                'code': code,
                'profit_rate': chip.get('chipProfitRate', 50),
                'avg_cost': chip.get('chipAvgCost', 0),
                'conc90': chip.get('chipConcentration90', 0),
                'conc70': chip.get('chipConcentration70', 0),
                'close': quote.get('close', 0),
                'change_pct': quote.get('change_percent', 0),
                'turnover': quote.get('turnover_rate', 0),
            })
    
    if len(chip_results) >= 10:
        print(f"筹码样本数: {len(chip_results)}")
        # 计算筹码因子与当日涨跌幅的截面相关
        change_vals = [c['change_pct'] for c in chip_results]
        
        for fname in ['profit_rate', 'conc90', 'conc70']:
            f_vals = [c[fname] for c in chip_results if c[fname] is not None]
            # 与涨跌幅对齐
            aligned_f = []
            aligned_r = []
            for c in chip_results:
                if c[fname] is not None:
                    aligned_f.append(c[fname])
                    aligned_r.append(c['change_pct'])
            
            ic = compute_ic(aligned_f, aligned_r)
            ric = rank_ic(aligned_f, aligned_r)
            print(f"  {fname:<15}: IC={ic:+.3f} RankIC={ric:+.3f} (与当日涨跌幅截面相关)")
    else:
        print("筹码数据不足，跳过截面分析")
    
    # --- 龙虎榜因子 ---
    print("\n" + "=" * 70)
    print("龙虎榜/大宗交易数据探索")
    print("=" * 70)
    
    lhb_count = 0
    block_count = 0
    for code in STOCKS:
        lhb = get_lhb_data(code)
        bt = get_blocktrade_data(code)
        if lhb:
            lhb_count += 1
            print(f"  {code}: 龙虎榜{len(lhb)}条")
            for item in lhb[:2]:
                print(f"    {item.get('date', '')} {item.get('reason', '')} 买入{item.get('buy_amount', 0)}万 卖出{item.get('sell_amount', 0)}万")
        if bt:
            block_count += len(bt)
            print(f"  {code}: 大宗交易{len(bt)}条")
    
    print(f"\n有龙虎榜的股票: {lhb_count}/{len(STOCKS)}")
    print(f"大宗交易总条数: {block_count}")
    
    # --- 输出研究结论 ---
    print("\n" + "=" * 70)
    print("研究结论与P8增强建议")
    print("=" * 70)
    
    # 找出IC最强的因子（绝对值>0.05为有意义，>0.08为较强）
    strong_pos = [r for r in ic_results if r['ic'] > 0.05]
    strong_neg = [r for r in ic_results if r['ic'] < -0.05]
    
    print("\n【正向因子（IC>0.05，值越大越涨）】")
    for r in strong_pos[:10]:
        print(f"  {r['factor']:<25} IC={r['ic']:+.3f} 胜率差={r['up_ratio_diff']:+.1f}%")
    
    print("\n【反向因子（IC<-0.05，值越大越跌）】")
    for r in strong_neg[:10]:
        print(f"  {r['factor']:<25} IC={r['ic']:+.3f} 胜率差={r['up_ratio_diff']:+.1f}%")
    
    # 保存结果
    output_file = os.path.join(OUTPUT_DIR, "factor_ic_analysis.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'sample_count': len(all_samples),
            'stock_count': len(STOCKS),
            'date_range': f"{start_date} ~ {end_date}",
            'ic_results': ic_results,
            'chip_results': chip_results,
        }, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n完整分析结果已保存到: {output_file}")
    print("\n研究完成！")

if __name__ == '__main__':
    main()
