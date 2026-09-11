export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <span>Total Sales</span>
          <strong>₹0</strong>
        </div>

        <div className="dashboard-card">
          <span>Total Orders</span>
          <strong>0</strong>
        </div>

        <div className="dashboard-card">
          <span>Customers</span>
          <strong>0</strong>
        </div>

        <div className="dashboard-card">
          <span>Products</span>
          <strong>0</strong>
        </div>
      </div>
    </>
  );
}
