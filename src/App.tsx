/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LokerLaptopPage from './pages/Loker';
import MahasiswaPage from './pages/Mahasiswa';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/loker" element={<LokerLaptopPage />} />
        <Route path="/mahasiswa" element={<MahasiswaPage />} />
      </Routes>
    </BrowserRouter>
  );
}

