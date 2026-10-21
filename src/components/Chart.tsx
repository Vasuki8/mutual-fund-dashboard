import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Download, RotateCcw } from 'lucide-react';
import { dateLabel, currency, percent, number } from '../lib/format.ts';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer]);
export const CHART_COLORS = ['#2d6a50', '#b18a4b', '#647fa4', '#a76c82'];
export interface ChartSeries { name: string; data: {date: string; value: number; detail?:string}[]; color?: string; area?: boolean }
interface Props { series: ChartSeries[]; unit?: 'currency' | 'percent' | 'number'; height?: number; title?: string; subtitle?: string }
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export function Chart({ series, unit = 'currency', height = 300, title = 'Historical performance', subtitle = 'Source: MFAPI • End-of-day NAV' }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current, undefined, {renderer: 'canvas'});
    instance.current = chart;
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(element.current);
    return () => { observer.disconnect(); chart.dispose(); instance.current = null; };
  }, []);
  useEffect(() => {
    const dates = [...new Set(series.flatMap(s => s.data.map(p => p.date)))].sort();
    const fmt = (v: number) => unit === 'percent' ? percent(v) : unit === 'currency' ? currency(v) : number(v, 4);
    instance.current?.setOption({
      animation: false,
      backgroundColor: '#ffffff',
      textStyle: {fontFamily: 'Inter, system-ui, sans-serif'},
      grid: {left: 12, right: 18, top: 20, bottom: 24, containLabel: true},
      tooltip: {
        trigger: 'axis', confine: true, padding: [12, 15], borderColor: '#e3e8e2', backgroundColor: '#fff',
        textStyle: {fontSize: 12, color: '#26332d'}, axisPointer: {type: 'line', lineStyle: {color: '#9caaa0', type: 'dashed'}},
        formatter: (params: unknown) => {
          const list = params as {axisValue:string;seriesName:string;color:string;value:number|null}[];
          if (!list.length) return '';
          const detail=series.flatMap(s=>s.data).find(p=>p.date===list[0].axisValue)?.detail;
          return `<div style="font-weight:600;margin-bottom:8px">${dateLabel(list[0].axisValue, true)}</div>` + (detail?`<div style="margin-bottom:8px">${escapeHtml(detail)}</div>`:'') + list.map(p => `<div style="display:flex;gap:20px;justify-content:space-between;margin:5px 0"><span><span style="color:${p.color}">●</span> ${escapeHtml(p.seriesName)}</span><b>${p.value == null ? 'No observation' : fmt(p.value)}</b></div>`).join('');
        },
      },
      xAxis: {type: 'category', data: dates, boundaryGap: false, axisTick: {show: false}, axisLine: {lineStyle:{color:'#e7ebe6'}}, axisLabel:{color:'#89928b',fontSize:11,hideOverlap:true,formatter:(value:string) => new Intl.DateTimeFormat('en-IN',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'))}},
      yAxis: {type:'value',scale:true,splitNumber:4,axisLabel:{color:'#89928b',fontSize:11,formatter:(v:number) => unit==='percent'?`${(v*100).toFixed(0)}%`:unit==='currency'?`₹${Math.abs(v)>=100000?(v/100000).toFixed(1)+'L':Math.abs(v)>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0)}`:number(v,0)},splitLine:{lineStyle:{color:'#eef0ed',type:'dashed'}}},
      dataZoom: [{type:'inside',zoomOnMouseWheel:'ctrl',moveOnMouseWheel:false,preventDefaultMouseMove:false}],
      series: series.map((s,i) => {
        const byDate = new Map(s.data.map(p=>[p.date,p.value]));
        const color = s.color ?? CHART_COLORS[i % CHART_COLORS.length];
        return {type:'line',name:s.name,data:dates.map(d=>byDate.get(d)??null),connectNulls:false,showSymbol:false,smooth:false,lineStyle:{width:2.2,color},itemStyle:{color},areaStyle:s.area?{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#dfece380'},{offset:1,color:'#ffffff00'}])}:undefined,emphasis:{focus:'series'}};
      }),
    }, {notMerge:true});
  }, [series, unit]);
  const exportChart = () => {
    const url = instance.current?.getDataURL({type:'png',pixelRatio:2,backgroundColor:'#fff'});
    if (!url) return;
    const a = document.createElement('a');a.href=url;a.download=`fundscope-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;a.click();
  };
  return <div className="chart-wrap">
    <div ref={element} style={{height}} role="img" aria-label={`${title}. ${series.map(s => s.name).join(', ')}. ${subtitle}. The values are available in the export and performance table.`}/>
    <div className="chart-foot"><span>{subtitle}</span><div><button className="text-action" onClick={()=>instance.current?.dispatchAction({type:'dataZoom',start:0,end:100})} title="Reset chart zoom"><RotateCcw size={12}/> Reset zoom</button><button className="text-action" onClick={exportChart} title="Download chart image"><Download size={12}/> PNG</button></div></div>
  </div>;
}
