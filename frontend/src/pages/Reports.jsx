const REPORTS = [
  {
    title: "Full inventory — CSV",
    description: "Every SKU with quantity, unit price, and stock value.",
    href: "/api/reports/inventory.csv"
  },
  {
    title: "Full inventory — PDF",
    description: "Formatted inventory report, ready to print or share.",
    href: "/api/reports/inventory.pdf"
  },
  {
    title: "Low stock items — CSV",
    description: "Only items at or below their reorder threshold.",
    href: "/api/reports/low-stock.csv"
  },
  {
    title: "Stock movement history — CSV",
    description: "The most recent 500 stock changes, with reason and reference.",
    href: "/api/reports/movements.csv"
  }
];

export default function Reports() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Export current inventory data for spreadsheets or sharing.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {REPORTS.map((r) => (
                <tr key={r.href}>
                  <td>{r.title}</td>
                  <td>{r.description}</td>
                  <td>
                    <div className="cell-actions">
                      <a className="btn btn-sm" href={r.href} download>
                        Download
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
