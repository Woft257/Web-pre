import { Clock3, LockKeyhole } from "lucide-react";

import { formatBangkokTime } from "@/lib/client/api";
import type { CurrentUser, TimelineEntry } from "@/lib/client/types";

export function TimelineView({ entries, user }: { entries: TimelineEntry[]; user: CurrentUser }) {
  if (!user.hasPrediction) {
    return (
      <section className="empty-state">
        <LockKeyhole size={28} />
        <h2>Timeline sẽ mở sau khi bạn gửi dự đoán</h2>
        <p>Hoàn thành đủ ba câu hỏi để xem thứ tự và câu trả lời của cộng đồng.</p>
      </section>
    );
  }

  return (
    <section className="timeline-section">
      <div className="view-heading">
        <div><p className="eyebrow">FCFS Timeline</p><h2>Thứ tự gửi dự đoán</h2></div>
        <span>{entries.length} lượt hợp lệ</span>
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
    </section>
  );
}
