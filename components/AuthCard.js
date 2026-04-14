export default function AuthCard({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 px-4">
      
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
        
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          {title}
        </h1>

        {children}

      </div>
    </div>
  );
}