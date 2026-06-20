import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NotificationToast } from './components/NotificationToast';
import { Dashboard } from './pages/Dashboard';
import { PromotionConfig } from './pages/PromotionConfig';
import { BillManagement } from './pages/BillManagement';
import { QuotaManagement } from './pages/QuotaManagement';
import { TransactionList } from './pages/TransactionList';
import { RentUmbrella } from './pages/RentUmbrella';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/promotion" element={<PromotionConfig />} />
          <Route path="/bills" element={<BillManagement />} />
          <Route path="/quota" element={<QuotaManagement />} />
          <Route path="/transactions" element={<TransactionList />} />
          <Route path="/rent" element={<RentUmbrella />} />
        </Routes>
      </Layout>
      <NotificationToast />
    </Router>
  );
}
