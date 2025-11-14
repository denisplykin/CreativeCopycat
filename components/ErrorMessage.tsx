export default function ErrorMessage({ 
  title = 'Error', 
  message 
}: { 
  title?: string; 
  message: string 
}) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p className="font-bold">{title}</p>
      <p>{message}</p>
    </div>
  );
}

