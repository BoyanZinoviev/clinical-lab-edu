import { AppShell } from './components/layout/AppShell';
import { useRoute } from './lib/router';
import Home from './pages/Home';
import MethodsIndex from './pages/MethodsIndex';
import About from './pages/About';
import NotFound from './pages/NotFound';
import Turbidimetry from './pages/Turbidimetry';
import Magnesium from './pages/Magnesium';
import Phosphorus from './pages/Phosphorus';
import Glucose from './pages/Glucose';
import Creatinine from './pages/Creatinine';
import ISE from './pages/ISE';
import BloodGas from './pages/BloodGas';
import HPLC from './pages/HPLC';
import Calibration from './pages/Calibration';
import QualityControl from './pages/QualityControl';

function Page({ path }: { path: string }) {
  switch (path) {
    case '/':
      return <Home />;
    case '/metodi':
      return <MethodsIndex />;
    case '/metodi/turbidimetriya':
      return <Turbidimetry />;
    case '/metodi/magnezii':
      return <Magnesium />;
    case '/metodi/fosfor':
      return <Phosphorus />;
    case '/metodi/glyukoza':
      return <Glucose />;
    case '/metodi/kreatinin':
      return <Creatinine />;
    case '/metodi/ise':
      return <ISE />;
    case '/metodi/kravno-gazov-analiz':
      return <BloodGas />;
    case '/metodi/hplc':
      return <HPLC />;
    case '/kalibraciya':
      return <Calibration />;
    case '/kachestven-kontrol':
      return <QualityControl />;
    case '/za-proekta':
      return <About />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  const route = useRoute();
  return (
    <AppShell route={route}>
      <Page path={route.path} />
    </AppShell>
  );
}
