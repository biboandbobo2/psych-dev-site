import Sidebar from '../components/Sidebar';

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid lg:grid-cols-[220px_minmax(0,1fr)]
                 gap-10 px-4 lg:px-8">
      <Sidebar />
      {children}
    </div>
  );
}
