import './styles.css';

export const metadata = {
  title: 'LizamaBet',
  description: 'Pronósticos, estadísticas y análisis deportivo.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
