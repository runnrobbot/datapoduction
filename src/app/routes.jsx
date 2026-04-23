import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Barang from './pages/Barang';
import BarangMasuk from './pages/BarangMasuk';
import Penjualan from './pages/Penjualan';
import PreOrder from './pages/PreOrder';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'barang', Component: Barang },
      { path: 'masuk', Component: BarangMasuk },
      { path: 'penjualan', Component: Penjualan },
      { path: 'pre-order', Component: PreOrder },
    ]
  }
]);
