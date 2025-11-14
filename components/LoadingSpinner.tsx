export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
}

