import { ChevronLeft, ChevronRight, Clock3, LockKeyhole } from "lucide-react";

import { formatBangkokTime } from "@/lib/client/api";
import type { CurrentUser, TimelineEntry, TimelinePagination } from "@/lib/client/types";

export function TimelineView({
  entries,
  pagination,
  user,
  onPageChange,
}: {
  entries: TimelineEntry[];
  pagination: TimelinePagination;
  user: CurrentUser;
  onPageChange: (page: number) => void;
}) {
  if (!user.hasPrediction) {
    return (
      <section className="empty-state">
        <LockKeyhole size={28} />
        <h2>Timeline sẽ mở sau khi bạn gửi dự đoán</h2>
        <p>Hoàn thành đủ ba câu hỏi để xem thứ tự và câu trả lời của cộng đồng.</p>
      </section>
    );
  }

  const firstPage = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, pagination.totalPages) },
    (_, index) => firstPage + index,
  );

  return (
    <section className="timeline-section">
      <div className="view-heading">
        <div><p className="eyebrow">FCFS Timeline</p><h2>Thứ tự gửi dự đoán</h2></div>
        <span>{pagination.total} lượt hợp lệ</span>
      </div>
      <div className="timeline-list">
        {entries.map((entry) => {
          const isCurrent = entry.submittedAt === user.submittedAt;
          return (
            <article className={`timeline-entry${isCurrent ? " current" : ""}`} key={`${entry.submittedAt}-${entry.order}`}>
              <div className="timeline-order">#{entry.order}</div>
              <div className="timeline-user">
                <strong>{entry.maskedUid}</strong>
                {isCurrent && <span>Bạn</span>}
                <small><Clock3 size={13} />{formatBangkokTime(entry.submittedAt)}</small>
              </div>
              <div className="timeline-answer"><span>Đội thắng</span><strong>{entry.winner === "argentina" ? "Argentina" : "Tây Ban Nha"}</strong></div>
              <div className="timeline-answer"><span>Tỉ số</span><strong>{entry.argentinaScore} : {entry.spainScore}</strong></div>
              <div className="timeline-answer"><span>Messi ghi bàn</span><strong>{entry.messiScores ? "Có" : "Không"}</strong></div>
            </article>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <nav className="pagination" aria-label="Phân trang timeline">
          <button type="button" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} aria-label="Trang trước">
            <ChevronLeft size={17} />
          </button>
          {pageNumbers.map((page) => (
            <button
              type="button"
              className={page === pagination.page ? "active" : ""}
              aria-current={page === pagination.page ? "page" : undefined}
              onClick={() => onPageChange(page)}
              key={page}
            >
              {page}
            </button>
          ))}
          <button type="button" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} aria-label="Trang sau">
            <ChevronRight size={17} />
          </button>
        </nav>
      )}
    </section>
  );
}
