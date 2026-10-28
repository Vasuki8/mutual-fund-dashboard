import type { FundData, NavPoint } from './types.ts';
import type { FinancialNavBasis, VerifiedUnitAdjustment } from './corporate-actions.ts';

const TWO_EVENT_WARNING =
  'Unresolved discontinuity: 2 single-observation move(s) exceed 40%; derived analytics are blocked.';
type Event = Omit<VerifiedUnitAdjustment, 'earlierEvents'>;
const events: readonly Event[] = [
  {
    schemeCode:135854,
    label:'verified 10-for-1 HDFC Sensex ETF unit split (record date 19 February 2021)',
    oldNavThrough:'2021-02-19',firstNewNavDate:'2021-02-22',factor:0.1,
    evidenceUrl:'https://www.msei.in/SX-Content/Circulars/2021/February/Circular-10126.pdf',
  },
  {
    schemeCode:135854,
    label:'verified 10-for-1 HDFC Sensex ETF unit split (exchange effective date 2 February 2024)',
    oldNavThrough:'2024-02-02',firstNewNavDate:'2024-02-05',factor:0.1,
    evidenceUrl:'https://nsearchives.nseindia.com/content/circulars/CML60421.pdf',
  },
];

function largeMove(previous:number,next:number):boolean {
  const ratio=next/previous;
  return ratio>1.4+1e-12 || ratio<0.6-1e-12;
}

function validSeries(points:readonly NavPoint[]):boolean {
  if(points.length<4)return false;
  for(let i=0;i<points.length;i++) {
    const point=points[i];
    if(!/^\d{4}-\d{2}-\d{2}$/.test(point.date) || !Number.isFinite(Date.parse(point.date))
      || new Date(point.date+'T00:00:00Z').toISOString().slice(0,10)!==point.date
      || !Number.isFinite(point.nav) || point.nav<=0
      || i>0 && points[i-1].date>=point.date)return false;
  }
  return true;
}

/** Both independently documented events must match; never apply a partial repair. */
export function sensexFinancialNavBasis(fund:FundData):FinancialNavBasis {
  const unchanged:FinancialNavBasis={fund,adjusted:false};
  if(fund.meta.schemeCode!==135854
    || fund.meta.schemeName.toLowerCase()!=='hdfc bse sensex etf - growth option'
    || fund.meta.isinGrowth!=='INF179KC1HX2' || fund.meta.fundHouse!=='HDFC Mutual Fund')return unchanged;
  const discontinuities=fund.warnings.filter(w=>/^Unresolved discontinuity\b/i.test(w));
  if(discontinuities.length!==1 || discontinuities[0]!==TWO_EVENT_WARNING
    || fund.warnings.some(w=>/^(?:Invalid NAV observations|Conflicting NAV values)\b/i.test(w))
    || !validSeries(fund.points))return unchanged;

  const jumps:number[]=[];
  for(let i=1;i<fund.points.length;i++) {
    if(largeMove(fund.points[i-1].nav,fund.points[i].nav))jumps.push(i);
  }
  if(jumps.length!==events.length)return unchanged;
  for(let i=0;i<events.length;i++) {
    const event=events[i],before=fund.points[jumps[i]-1],after=fund.points[jumps[i]];
    if(before.date!==event.oldNavThrough || after.date!==event.firstNewNavDate
      || Math.abs(after.nav/before.nav-event.factor)>0.005)return unchanged;
  }

  // Factors compound: pre-2021 NAV /100, intermediate NAV /10, newest NAV unchanged.
  // Use issuer factors, not fitted ratios, so the ordinary market returns survive.
  const points=fund.points.map(point=>{
    let nav=point.nav;
    for(const event of events)if(point.date<event.firstNewNavDate)nav*=event.factor;
    return {...point,nav};
  });
  if(!validSeries(points) || points.some((point,i)=>i>0&&largeMove(points[i-1].nav,point.nav)))return unchanged;
  const adjustment:VerifiedUnitAdjustment={...events[1],earlierEvents:[{...events[0]}]};
  return {adjusted:true,adjustment,fund:{...fund,points,
    warnings:fund.warnings.filter(w=>w!==TWO_EVENT_WARNING)}};
}
