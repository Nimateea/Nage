// Shared layout for auth pages — centered, no sidebar
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-bg-base px-4">
      {children}
    </div>
  );
}
