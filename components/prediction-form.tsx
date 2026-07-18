"use client";

import { Check, Clock3, LoaderCircle, LockKeyhole, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { TeamFlag } from "@/components/team-flag";
import { apiRequest, formatBangkokTime, formatEventDeadline } from "@/lib/client/api";
import type { ContestSettings, Prediction, TeamChoice } from "@/lib/client/types";

export function PredictionForm({
  settings,
  prediction,
  onSubmitted,
}: {
  settings: ContestSettings;
  prediction: Prediction | null;
  onSubmitted: (prediction: Prediction) => void;
}) {
  const [winner, setWinner] = useState<TeamChoice>("argentina");
  const [argentinaScore, setArgentinaScore] = useState(0);
  const [spainScore, setSpainScore] = useState(0);
  const [messiScores, setMessiScores] = useState<boolean>(true);
  const [bdName, setBdName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || prediction) return;
    setLoading(true);
    setError("");
    try {
      const saved = await apiRequest<Prediction>("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ winner, argentinaScore, spainScore, messiScores, bdName }),
      });
      onSubmitted(saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi dự đoán");
    } finally {
      setLoading(false);
    }
  }

  if (prediction) {
    return (
      <section className="prediction-complete" aria-labelledby="prediction-complete-title">
        <div className="success-mark"><Check size={25} /></div>
        <div>
          <p className="eyebrow">Đã ghi nhận</p>
          <h2 id="prediction-complete-title">Dự đoán của bạn đã được khóa</h2>
          <p>Đã gửi lúc {formatBangkokTime(prediction.submittedAt)}. Kết quả không thể chỉnh sửa.</p>
        </div>
        <PredictionSummary prediction={prediction} />
      </section>
    );
  }

  return (
    <form className="prediction-form" onSubmit={submit}>
      <div className="prediction-heading">
        <div>
          <p className="eyebrow">Phiếu dự đoán</p>
          <h2>Chung kết World Cup 2026</h2>
        </div>
        <div className={settings.acceptingPredictions ? "deadline-status open" : "deadline-status closed"}>
          <Clock3 size={15} />
          {settings.acceptingPredictions
            ? `Đóng lúc ${formatEventDeadline(settings.submissionClosesAt)}`
            : "Đã đóng dự đoán"}
        </div>
      </div>

      <fieldset disabled={!settings.acceptingPredictions || loading}>
        <legend><span>01</span>Dự đoán đội chiến thắng của trận chung kết World Cup 2026</legend>
        <div className="team-options">
          <button type="button" className={winner === "argentina" ? "selected" : ""} onClick={() => setWinner("argentina")}>
            <TeamFlag code="ARG" size={34} /><span>Argentina</span>{winner === "argentina" && <Check size={17} />}
          </button>
          <button type="button" className={winner === "spain" ? "selected" : ""} onClick={() => setWinner("spain")}>
            <TeamFlag code="ESP" size={34} /><span>Tây Ban Nha</span>{winner === "spain" && <Check size={17} />}
          </button>
        </div>
      </fieldset>

      <fieldset disabled={!settings.acceptingPredictions || loading}>
        <legend><span>02</span>Dự đoán tỉ số chính xác của trận đấu</legend>
        <div className="score-inputs">
          <label>
            <span><TeamFlag code="ARG" size={24} /> Argentina</span>
            <input aria-label="Tỉ số Argentina" type="number" min={0} max={20} value={argentinaScore} onChange={(event) => setArgentinaScore(Number(event.target.value))} />
          </label>
          <strong>:</strong>
          <label>
            <span><TeamFlag code="ESP" size={24} /> Tây Ban Nha</span>
            <input aria-label="Tỉ số Tây Ban Nha" type="number" min={0} max={20} value={spainScore} onChange={(event) => setSpainScore(Number(event.target.value))} />
          </label>
        </div>
      </fieldset>

      <fieldset disabled={!settings.acceptingPredictions || loading}>
        <legend><span>03</span>Dự đoán Messi có ghi bàn thắng trong trận hay không</legend>
        <div className="binary-options">
          <button type="button" className={messiScores ? "selected positive" : ""} onClick={() => setMessiScores(true)}>Có</button>
          <button type="button" className={!messiScores ? "selected negative" : ""} onClick={() => setMessiScores(false)}>Không</button>
        </div>
      </fieldset>

      <fieldset disabled={!settings.acceptingPredictions || loading}>
        <legend><span>04</span>BD đang hỗ trợ bạn là ai? <small>Không tính điểm</small></legend>
        <label className="bd-support-field">
          <span>Tên BD hỗ trợ</span>
          <input
            aria-label="BD đang hỗ trợ bạn là ai?"
            value={bdName}
            onChange={(event) => setBdName(event.target.value.slice(0, 100))}
            minLength={1}
            maxLength={100}
            autoComplete="organization-title"
            required
          />
          <small>Chỉ dùng để phân loại dữ liệu nội bộ, không hiển thị trên timeline hoặc bảng xếp hạng.</small>
        </label>
      </fieldset>

      <aside className="scoring-note">
        <strong>Cách tính điểm</strong>
        <p>Mỗi câu trả lời đúng trong 3 câu dự đoán là 10 điểm. Tên BD hỗ trợ không tính điểm. Trường hợp có nhiều người cùng đưa ra câu trả lời đúng, phần thưởng sẽ ưu tiên cho người gửi dự đoán sớm nhất.</p>
      </aside>

      <label className="confirm-row">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!settings.acceptingPredictions || loading} />
        <span>Tôi xác nhận các câu trả lời trên là cuối cùng và không thể chỉnh sửa sau khi gửi.</span>
      </label>

      <div className="form-status" aria-live="polite">{error && <span className="form-error">{error}</span>}</div>
      <button className="primary-button submit-prediction" type="submit" disabled={!settings.acceptingPredictions || !bdName.trim() || !confirmed || loading}>
        {loading ? <LoaderCircle className="spin" size={18} /> : settings.acceptingPredictions ? <Send size={18} /> : <LockKeyhole size={18} />}
        {settings.acceptingPredictions ? "Gửi dự đoán" : "Dự đoán đã đóng"}
      </button>
    </form>
  );
}

export function PredictionSummary({ prediction }: { prediction: Prediction }) {
  return (
    <div className="prediction-summary">
      <div><span>Đội chiến thắng</span><strong>{prediction.winner === "argentina" ? "Argentina" : "Tây Ban Nha"}</strong></div>
      <div><span>Tỉ số chính xác</span><strong>ARG {prediction.argentinaScore} : {prediction.spainScore} ESP</strong></div>
      <div><span>Messi ghi bàn</span><strong>{prediction.messiScores ? "Có" : "Không"}</strong></div>
    </div>
  );
}
