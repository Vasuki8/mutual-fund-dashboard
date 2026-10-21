export interface RollingWindow { start:string; end:string; value:number }
export function rollingChartData(windows:RollingWindow[]):{date:string;value:number;detail:string}[] {
  return windows.map(window=>({date:window.start,value:window.value,detail:`Window: ${window.start} to ${window.end}`}));
}
