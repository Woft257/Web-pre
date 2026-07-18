"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="full-page-error">
      <TriangleAlert size={30} />
      <h1>Không thể tải dữ liệu sự kiện</h1>
      <button className="primary-button" type="button" onClick={reset}>
        <RefreshCw size={17} /> Thử lại
      </button>
    </div>
  );
}
