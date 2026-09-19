import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

// Public-site chrome (navbar + footer). The /admin route lives outside of this layout.
export default function SiteLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
