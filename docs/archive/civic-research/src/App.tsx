import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import DeadlinesPage from './pages/DeadlinesPage';
import IDRequirementsPage from './pages/IDRequirementsPage';
import PollingPlacePage from './pages/PollingPlacePage';
import ChatPage from './pages/ChatPage';
import ResearchPortfolioPage from './pages/ResearchPortfolioPage';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/deadlines" element={<DeadlinesPage />} />
          <Route path="/id-rules" element={<IDRequirementsPage />} />
          <Route path="/polling" element={<PollingPlacePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/portfolio" element={<ResearchPortfolioPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
