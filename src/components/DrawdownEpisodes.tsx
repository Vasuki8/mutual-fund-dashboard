import { useMemo } from 'react';
import { drawdownEpisodes, isGrowthScheme, selectDrawdownEpisodes } from '../lib/analytics.ts';
import { dateLabel, number, percent, qualityBlocked } from '../lib/format.ts';
import type { FundData, NavPoint } from '../lib/types.ts';

interface Props { fund: FundData; points: NavPoint[] }

export function DrawdownEpisodes({ fund, points }: Props) {
  const eligible = isGrowthScheme(fund.meta.schemeName) && !qualityBlocked(fund);
  const episodes = useMemo(() => eligible ? drawdownEpisodes(points) : [], [eligible, points]);
  const shown = useMemo(() => selectDrawdownEpisodes(episodes), [episodes]);
  const additionalOpenEpisode = shown.length > Math.min(5, episodes.length);
  const lastDate = points.at(-1)?.date;

  return <section className="panel drawdown-episodes" aria-labelledby="drawdown-episodes-heading">
    <div className="panel-heading">
      <div>
        <h2 id="drawdown-episodes-heading">Drawdown episodes</h2>
        <p>Five deepest observed declines in the selected period. An unrecovered decline is always included.</p>
      </div>
      {eligible && episodes.length > 0 && <span className="pill">{shown.length} of {episodes.length} shown</span>}
    </div>
    {!eligible ? <p className="reading-copy">Episode analysis unavailable. This view requires a confirmed Growth option with no unresolved history-quality issues.</p>
      : points.length < 2 ? <p className="reading-copy">At least two NAV observations are needed to identify a decline.</p>
        : episodes.length === 0 ? <p className="reading-copy">No decline was observed in this period. This describes the available NAV observations only.</p>
          : <>
            <div className="table-scroll" role="region" aria-label="Scrollable drawdown episode table" tabIndex={0}>
              <table className="simple-table episode-table" aria-label="Drawdown episodes">
                <thead><tr>
                  <th scope="col">Peak date</th>
                  <th scope="col">Trough date</th>
                  <th scope="col" className="numeric">Decline</th>
                  <th scope="col" className="numeric">Days to trough</th>
                  <th scope="col">Recovery date</th>
                  <th scope="col" className="numeric">Days to recover</th>
                  <th scope="col" className="numeric">Days below peak</th>
                  <th scope="col">Status</th>
                </tr></thead>
                <tbody>{shown.map(episode => <tr key={episode.peakDate} className={episode.recoveryDate === null ? 'episode-unrecovered' : undefined}>
                  <td>{dateLabel(episode.peakDate, true)}</td>
                  <td>{dateLabel(episode.troughDate, true)}</td>
                  <td className="numeric negative">{percent(episode.drawdown)}</td>
                  <td className="numeric">{number(episode.declineDays, 0)}</td>
                  <td>{episode.recoveryDate ? dateLabel(episode.recoveryDate, true) : <span className="muted">Not observed</span>}</td>
                  <td className="numeric">{number(episode.recoveryDays, 0)}</td>
                  <td className="numeric">{number(episode.underwaterDays, 0)}{episode.recoveryDate === null && <span className="episode-duration-note"> so far</span>}</td>
                  <td><span className={episode.recoveryDate === null ? 'episode-status negative' : 'episode-status'}>{episode.recoveryDate === null ? 'Unrecovered' : 'Recovered'}</span></td>
                </tr>)}</tbody>
              </table>
            </div>
            <p className="panel-note">Calendar days. Recovery time runs from the trough to the first observed NAV at or above the prior peak. Time below peak runs from the peak to recovery, or to {dateLabel(lastDate, true)} when unrecovered.</p>
            <p className="panel-note episode-scope-note">{additionalOpenEpisode && 'The unrecovered episode is included in addition to the five deepest declines. '}Peaks start within the selected range. Missing observations can hide a deeper decline or an earlier recovery; no values are estimated.</p>
          </>}
  </section>;
}
