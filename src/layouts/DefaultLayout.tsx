import Sidebar from '../components/Sidebar';

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6 p-4">
      <Sidebar />
      {children}
    </div>
  );
}
