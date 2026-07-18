import { Clock3, Medal, Trophy } from "lucide-react";

import { formatBangkokTime } from "@/lib/client/api";
import type { LeaderboardData } from "@/lib/client/types";

export function ContestLeaderboard({ data }: { data: LeaderboardData }) {
  if (!data.published) {
    return (
      <section className="empty-state">
        <Trophy size={30} />
        <h2>Bảng xếp hạng chưa được công bố</h2>
        <p>Admin sẽ nhập kết quả chính thức và công bố thứ hạng sau khi trận đấu kết thúc.</p>
      </section>
    );
  }

  return (
    <section className="leaderboard-section">
      <div className="view-heading">
        <div><p className="eyebrow">Official Results</p><h2>Bảng xếp hạng</h2></div>
        <div className="official-result">
          <span>Kết quả</span>
          <strong>
            {data.result?.winner === "argentina" ? "Argentina" : "Tây Ban Nha"} thắng
            {" · "}{data.result?.argentinaScore} : {data.result?.spainScore}
            {" · "}Messi: {data.result?.messiScores ? "Có" : "Không"}
          </strong>
        </div>
      </div>
      <div className="leaderboard-table-wrap">
        <table className="leaderboard-table">
          <thead><tr><th>Hạng</th><th>UID</th><th>Câu đúng</th><th>Điểm</th><th>Thời gian gửi</th></tr></thead>
          <tbody>
            {data.entries.map((entry) => (
              <tr key={`${entry.rank}-${entry.maskedUid}`}>
                <td><span className={`rank-badge rank-${entry.rank}`}>{entry.rank <= 3 ? <Medal size={16} /> : null}{entry.rank}</span></td>
                <td><strong>{entry.maskedUid}</strong></td>
                <td>{entry.correctAnswers}/3</td>
                <td><strong className="points-value">{entry.points} điểm</strong></td>
                <td><Clock3 size={13} /> {formatBangkokTime(entry.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
