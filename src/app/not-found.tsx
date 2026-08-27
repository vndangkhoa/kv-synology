import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <h2 className="text-4xl font-bold text-sky-500 mb-2">404</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Không tìm thấy trang được yêu cầu.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
      >
        Trở về bảng điều khiển
      </Link>
    </div>
  );
}
