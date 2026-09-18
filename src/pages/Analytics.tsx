import { useMemo } from "react";
import { Briefcase, TrendingUp } from "lucide-react";
import { useData } from "@/store/DataContext";
import {
  computeMetrics,
  statusBreakdown,
  groupBy,
  monthlyApplications,
} from "@/lib/metrics";
import { BarList, MonthlyBars, Donut } from "@/components/analytics/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useUIState } from "@/store/UIStateContext";
import { STATUS_CONFIG } from "@/config/status";

const pct = (v: number | null) => (v === null ? null : Math.round(v * 100));

export function Analytics() {
  const { jobs, events, companyById } = useData();
  const { openAdd } = useUIState();

  const metrics = useMemo(() => computeMetrics(jobs, events), [jobs, events]);
  const months = useMemo(() => monthlyApplications(jobs), [jobs]);
  const topCompanies = useMemo(() => groupBy(jobs, (j) => j.company_name), [jobs]);
  const industries = useMemo(() => {
    return groupBy(jobs, (j) => (j.company_id ? companyById(j.company_id)?.industry : null) ?? null);
  }, [jobs, companyById]);
  const status = useMemo(
    () =>
      statusBreakdown(jobs).map((s) => ({
        label: s.label,
        value: s.value,
        color: STATUS_CONFIG[s.key].tone === "orange" ? "orange" : undefined,
      })),
    [jobs]
  );

  const submitted = useMemo(() => jobs.filter((j) => j.status !== "saved"), [jobs]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={26} />}
        title="NOTHING TO ANALYZE YET."
        description="Add a few applications and your pipeline analytics will appear here automatically."
        action={
          <Button onClick={openAdd}>
            <Briefcase size={16} /> Add your first application
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 className="page-title">Analytics</h1>
        <div className="company-count">Real numbers from your {jobs.length} applications</div>
      </div>

      <div className="panel panel-analytics section" style={{ marginBottom: 20 }}>
        <h2 className="section-label" style={{ marginBottom: 18 }}>Conversion rates</h2>
        <div className="an-rate-grid">
          <div className="an-rate">
            <span className="an-rate-value">{pct(metrics.responseRate) ?? "—"}</span>
            <span className="an-rate-label">Response rate</span>
          </div>
          <div className="an-rate">
            <span className="an-rate-value">{pct(metrics.interviewRate) ?? "—"}</span>
            <span className="an-rate-label">Interview rate</span>
          </div>
          <div className="an-rate">
            <span className="an-rate-value">{pct(metrics.offerRate) ?? "—"}</span>
            <span className="an-rate-label">Offer rate</span>
          </div>
          <div className="an-rate">
            <span className="an-rate-value">{pct(metrics.rejectionRate) ?? "—"}</span>
            <span className="an-rate-label">Rejection rate</span>
          </div>
          <div className="an-rate">
            <span className="an-rate-value">
              {metrics.followUpCompletionRate === null ? "—" : pct(metrics.followUpCompletionRate)}
            </span>
            <span className="an-rate-label">Follow-up completion</span>
          </div>
          <div className="an-rate">
            <span className="an-rate-value">{metrics.active}</span>
            <span className="an-rate-label">Currently active</span>
          </div>
        </div>
      </div>

      <div className="an-grid">
        <div className="panel panel-analytics section">
          <h2 className="section-label" style={{ marginBottom: 16 }}>
            Applications per month
          </h2>
          <MonthlyBars data={months} />
        </div>

        <div className="panel panel-analytics section">
          <h2 className="section-label" style={{ marginBottom: 16 }}>Pipeline by stage</h2>
          <BarList data={status} max={Math.max(1, jobs.length)} />
        </div>

        <div className="panel panel-analytics section">
          <h2 className="section-label" style={{ marginBottom: 16 }}>Top companies</h2>
          {topCompanies.length === 0 ? (
            <div className="faint">No data yet</div>
          ) : (
            <BarList data={topCompanies.slice(0, 6)} />
          )}
        </div>

        <div className="panel panel-analytics section">
          <h2 className="section-label" style={{ marginBottom: 16 }}>Industry mix</h2>
          {industries.length === 0 ? (
            <div className="faint">Add industry info to see this breakdown</div>
          ) : (
            <BarList data={industries.slice(0, 6)} />
          )}
        </div>

        <div className="panel panel-analytics section">
          <h2 className="section-label" style={{ marginBottom: 16 }}>Interview conversion</h2>
          <div className="an-legend">
            <span className="an-legend-item">
              <span className="an-legend-swatch" style={{ background: "var(--orange)" }} /> Interviewed
            </span>
            <span className="an-legend-item">
              <span className="an-legend-swatch" style={{ background: "var(--black)" }} /> Not yet
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <Donut
              percent={metrics.interviewRate ?? 0}
              label={`of ${submitted.length} submitted`}
              color={metrics.interviewRate ? "var(--orange)" : "rgba(0,0,0,0.15)"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}