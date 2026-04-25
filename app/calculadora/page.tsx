import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import CalculatorWizard from '@/components/CalculatorWizard';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Calculadora de Calorías | Entrena con Ciencia',
  description:
    'Calcula tus calorías y macronutrientes personalizados con la fórmula Mifflin-St Jeor o Katch-McArdle. Elige tu distribución de macros y recibe tus resultados.',
};

export default function CalculadoraPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-screen" style={{ background: '#EDF5FA' }}>
        <CalculatorWizard />
      </main>
      <Footer />
    </>
  );
}
