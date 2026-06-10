export default function AuthCard({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        
        <h1 className="text-3xl font-bold text-slate-900 text-center mb-6">
          {title}
        </h1>

        {children}

      </div>
    </div>
  );
}
