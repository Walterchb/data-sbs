// Projection is immutable: a missing entity never inherits BanBif's figures.
export function selectReport(report, entity = "banbif") {
  if (entity === "banbif") return report;
  return {
    ...report,
    periods: report.periods.map((p) => {
      const values = p.peers?.[entity] || {};
      const effective = p.peer_effective?.[entity] || p.effective;
      const warning =
        report.code === "B-230809"
          ? Object.keys(values).some((id) => effective[id] !== p.date)
            ? "El trimestre declarado por la entidad difiere del archivo SBS."
            : null
          : p.warning;
      return {
        ...p,
        values,
        effective,
        warning,
        source_caption: p.peer_captions?.[entity] || p.source_caption,
        keys: Object.fromEntries(
          Object.entries(p.keys).map(([key, m]) => [
            key,
            {
              ...m,
              value: values[m.id] ?? null,
              date: effective[m.id] || m.date,
            },
          ]),
        ),
      };
    }),
  };
}
export function selectFinancial(base, bundle) {
  if (!bundle || bundle.entity === "banbif") return base;
  const peers = new Map(base.periods.map((p) => [p.date, p.peers]));
  return {
    ...base,
    periods: bundle.financial.map((p) => ({
      ...p,
      peers: peers.get(p.date) || [],
    })),
  };
}
export function selectOverview(base, bundle) {
  return !bundle || bundle.entity === "banbif"
    ? base
    : { ...base, periods: bundle.overview };
}
