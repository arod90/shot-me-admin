import Layout from './components/Layout';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
