import React from 'react'

export function PupFooter() {
  return (
    <footer className="pup-footer text-white text-xs">
      <div className="flex items-center gap-3">
        <span className="font-serif font-bold text-sm tracking-wide text-[#C8960C]">PUP Caloocan SCMS</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="hidden sm:inline text-gray-200">
          Syllabus Compliance Monitoring System — Polytechnic University of the Philippines Caloocan Campus
        </span>
      </div>
      <div className="flex items-center gap-4 text-gray-300">
        <span>Data Privacy Act (RA 10173) Compliant</span>
        <span className="hidden md:inline text-[#C8960C] font-mono">v1.0.0-audited</span>
      </div>
    </footer>
  )
}
