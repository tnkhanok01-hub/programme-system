"use client"

interface Props {
  countdown: number
}

export default function SessionWarningModal({ countdown }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-6 sm:p-8">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 mx-auto mb-4">
          <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">Still there?</h2>

        <p className="text-gray-500 text-sm mb-4 leading-relaxed">
          You&apos;ll be logged out due to inactivity in
        </p>

        <div className="text-5xl font-bold text-red-500 mb-4 tabular-nums">
          {Math.max(0, countdown)}
        </div>

        <p className="text-gray-400 text-sm">
          Move your mouse or tap anywhere to stay logged in.
        </p>
      </div>
    </div>
  )
}
