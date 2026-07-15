import React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

// Phần 5.7 — Error boundary: bắt lỗi render (crash) ở bất kỳ trang nào, hiện màn hình lỗi thân thiện
// thay vì màn hình trắng, kèm nút tải lại thay vì phải tự F5 và mất ngữ cảnh.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary bắt được lỗi:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow-sm">
            <AlertOctagon className="h-8 w-8 text-red-500" />
            <p className="text-sm font-semibold text-slate-900">Đã có lỗi xảy ra khi hiển thị trang này.</p>
            <p className="text-xs text-slate-500">
              {this.state.error?.message || "Lỗi không xác định."}
            </p>
            <button
              onClick={() => window.location.assign("/")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <RotateCcw size={16} strokeWidth={2} />
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
