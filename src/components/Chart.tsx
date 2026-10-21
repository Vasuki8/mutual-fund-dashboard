import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Download, RotateCcw } from 'lucide-react';
import { dateLabel, currency, percent, number } from '../lib/format.ts';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer]);
export const CHART_COLORS = ['#a4b4ff', '#75cfc0', '#efc479', '#dba8dd'];
const CHART_THEME = { panel: '#1d2028', raised: '#252a34', border: '#353d4b', text: '#e9edf4', muted: '#adb7c8', grid: '#303744' };
export interface ChartSeries { name: string; data: {date: string; value: number; detail?:string}[]; color?: string; area?: boolean }
interface Props { series: ChartSeries[]; unit?: 'currency' | 'percent' | 'number'; valuePrecision?: number; height?: number; title?: string; subtitle?: string }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function Chart({ series, unit = 'currency', valuePrecision, height = 300, title = 'Historical performance', subtitle = 'Source: MFAPI • End-of-day NAV' }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    const container = element.current;
    if (!container) return;
    const chart = echarts.init(container, undefined, {renderer: 'canvas'});
    instance.current = chart;
    let width = chart.getWidth(), chartHeight = chart.getHeight();
    let frame: number | null = null;
    let disposed = false;
    const observer = new ResizeObserver(() => {
      if (disposed || frame !== null) return;
      // Chart writes run outside observer delivery. Read the latest layout when
      // the frame runs so rapid sidebar/viewport changes share one resize.
      frame = requestAnimationFrame(() => {
        frame = null;
        if (disposed || !container.isConnected) return;
        const nextWidth = container.clientWidth, nextHeight = container.clientHeight;
        if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) return;
        if (nextWidth === width && nextHeight === chartHeight) return;
        width = nextWidth; chartHeight = nextHeight;
        chart.resize({width, height: chartHeight, silent: true});
      });
    });
    observer.observe(container);
    return () => {
      disposed = true;
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      chart.dispose();
      if (instance.current === chart) instance.current = null;
    };
  }, []);
  useEffect(() => {
    const dates = [...new Set(series.flatMap(s => s.data.map(p => p.date)))].sort();
    const fmt = (v: number) => unit === 'percent' ? percent(v, valuePrecision ?? 2) : unit === 'currency' ? currency(v, valuePrecision ?? 2) : number(v, valuePrecision ?? 4);
    const shortRange = dates.length > 0 && Date.parse(dates.at(-1)!) - Date.parse(dates[0]) <= 93 * 86400000;
    const axisDate = new Intl.DateTimeFormat('en-IN', shortRange ? {day: 'numeric', month: 'short', timeZone: 'UTC'} : {month: 'short', year: '2-digit', timeZone: 'UTC'});
    instance.current?.setOption({
      animation: false,
      backgroundColor: CHART_THEME.panel,
      textStyle: {fontFamily: 'Segoe UI, Arial, sans-serif', color: CHART_THEME.text},
      grid: {left: 12, right: 18, top: 20, bottom: 24, containLabel: true},
      tooltip: {
        trigger: 'axis', confine: true, padding: [8, 12], borderColor: CHART_THEME.border, backgroundColor: CHART_THEME.raised,
        textStyle: {fontSize: 12, color: CHART_THEME.text}, axisPointer: {type: 'line', lineStyle: {color: CHART_THEME.muted, type: 'dashed'}},
        extraCssText: 'border-radius:4px;max-width:calc(100% - 16px);white-space:normal;',
        formatter: (params: unknown) => {
          const list = params as {axisValue:string;seriesName:string;color:string;value:number|null}[];
          if (!list.length) return '';
          const detail=series.flatMap(s=>s.data).find(p=>p.date===list[0].axisValue)?.detail;
          return `<div style="font-weight:600;margin-bottom:8px">${dateLabel(list[0].axisValue, true)}</div>` + (detail?`<div style="margin-bottom:8px">${escapeHtml(detail)}</div>`:'') + list.map(p => `<div style="display:flex;gap:16px;justify-content:space-between;margin:4px 0"><span style="min-width:0;overflow-wrap:anywhere"><span style="color:${escapeHtml(p.color)}">●</span> ${escapeHtml(p.seriesName)}</span><b style="font-family:Consolas,'Courier New',monospace;white-space:nowrap">${p.value == null ? 'No observation' : fmt(p.value)}</b></div>`).join('');
        },
      },
      xAxis: {type: 'category', data: dates, boundaryGap: false, axisTick: {show: false}, axisLine: {lineStyle:{color:CHART_THEME.grid}}, axisLabel:{color:CHART_THEME.muted,fontSize:11,hideOverlap:true,formatter:(value:string) => axisDate.format(new Date(value+'T00:00:00Z'))}},
      yAxis: {type:'value',scale:true,splitNumber:4,axisLabel:{color:CHART_THEME.muted,fontFamily:"Consolas, 'Courier New', monospace",fontSize:11,formatter:(v:number) => unit==='percent'?`${number(v*100,1)}%`:unit==='currency'?valuePrecision!=null?currency(v,valuePrecision):`₹${Math.abs(v)>=100000?(v/100000).toFixed(1)+'L':Math.abs(v)>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0)}`:number(v,0)},splitLine:{lineStyle:{color:CHART_THEME.grid,type:'dashed'}}},
      dataZoom: [{type:'inside',zoomOnMouseWheel:'ctrl',moveOnMouseWheel:false,preventDefaultMouseMove:false}],
      series: series.map((s,i) => {
        const byDate = new Map(s.data.map(p=>[p.date,p.value]));
        const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
        return {type:'line',name:s.name,data:dates.map(d=>byDate.get(d)??null),connectNulls:false,showSymbol:false,smooth:false,lineStyle:{width:2,color},itemStyle:{color},areaStyle:s.area?{color,opacity:.1}:undefined,emphasis:{focus:'series'}};
      }),
    }, {notMerge:true});
  }, [series, unit, valuePrecision]);
  const exportChart = () => {
    const url = instance.current?.getDataURL({type:'png',pixelRatio:2,backgroundColor:CHART_THEME.panel});
    if (!url) return;
    const a = document.createElement('a');a.href=url;a.download=`fundscope-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;a.click();
  };
  return <div className="chart-wrap">
    <div ref={element} style={{height}} role="img" aria-label={`${title}. ${series.map(s => s.name).join(', ')}. Values in ${unit==='currency'?'Indian rupees':unit==='percent'?'percent':'units'}. ${subtitle}.`}/>
    <div className="chart-foot"><span>{subtitle}</span><div><button className="text-action" onClick={()=>instance.current?.dispatchAction({type:'dataZoom',start:0,end:100})} aria-label={`Reset zoom for ${title}`} title="Reset chart zoom"><RotateCcw size={12} aria-hidden="true"/> Reset zoom</button><button className="text-action" onClick={exportChart} aria-label={`Download ${title} as PNG`} title="Download chart image"><Download size={12} aria-hidden="true"/> PNG</button></div></div>
  </div>;
}
