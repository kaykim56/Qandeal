export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 w-screen bg-gray-100 overflow-auto z-50">
      {children}
    </div>
  );
}
