export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col items-center justify-center p-5 font-sans">
      
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="text-white text-[18px] font-bold m-0">
          UTM Smart Programme Management System
        </h1>
        <p className="text-slate-400 text-[14px] mt-1 font-semibold">
          (UTM-SPMS)
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#111c33] w-full max-w-[420px] rounded-2xl p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-white/5">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold mx-auto">
          U
        </div>

        {/* Title */}
        <h2 className="text-white mt-4 mb-5 text-xl">
          User Profile
        </h2>

        {/* Info Grid */}
        <div className="flex flex-col gap-3 mb-5">
          
          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Status</p>
            <p className="text-white text-sm">No user logged in</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Message</p>
            <p className="text-white text-sm">
              Please login to view profile data
            </p>
          </div>

        </div>

        {/* Button */}
        <button
          disabled
          className="w-full py-3 rounded-lg bg-blue-500 text-white font-semibold opacity-60 cursor-not-allowed"
        >
          Login
        </button>

      </div>
    </div>
  );
}