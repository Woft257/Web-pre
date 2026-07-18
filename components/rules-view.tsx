import { AlertTriangle, Gift, LockKeyhole, ScrollText, ShieldCheck } from "lucide-react";

export function RulesView() {
  return (
    <section className="rules-section">
      <div className="view-heading"><div><p className="eyebrow">Event Terms</p><h2>Thể lệ &amp; lưu ý</h2></div></div>

      <div className="rules-band">
        <div className="rules-band-title"><ScrollText size={21} /><h3>Thể lệ &amp; lưu ý</h3></div>
        <p>Anh em tham gia dự đoán 3 nội dung sau:</p>
        <ol>
          <li>Dự đoán đội chiến thắng của trận đấu.</li>
          <li>Dự đoán tỉ số chính xác của trận đấu.</li>
          <li>Dự đoán Messi có ghi bàn thắng trong trận hay không.</li>
        </ol>
        <p><strong>Mỗi câu trả lời đúng là 10 điểm.</strong> Trường hợp có nhiều người cùng đưa ra câu trả lời đúng, phần thưởng sẽ ưu tiên cho người gửi dự đoán sớm nhất.</p>
      </div>

      <div className="rules-band prize-band">
        <div className="rules-band-title"><Gift size={21} /><h3>Tổng giá trị giải thưởng: 2,000 USDT</h3></div>
        <div className="prize-grid">
          <div><span>Top 1</span><strong>Louis Vuitton Imagination EDP</strong></div>
          <div><span>Top 2</span><strong>Montblanc - Ví đựng thẻ Sartorial</strong></div>
          <div><span>Top 3</span><strong>Cúp Vô Địch Fifa World Cup - Lego Editions Sports</strong></div>
          <div><span>Top 4-10</span><strong>Diptyque - Sáp thơm treo Baies</strong></div>
          <div><span>10 Lucky Draw</span><strong>Bình nước Stanley phiên bản World Cup</strong></div>
        </div>
      </div>

      <div className="rules-band">
        <div className="rules-band-title"><LockKeyhole size={21} /><h3>Đối tượng tham gia</h3></div>
        <p>Chương trình chỉ áp dụng độc quyền cho người dùng tại Việt Nam và cộng đồng KOL được mời tham gia.</p>
      </div>

      <div className="rules-band disclaimer-band">
        <div className="rules-band-title"><AlertTriangle size={21} /><h3>Disclaimer</h3></div>
        <p>Chỉ những người dùng đăng ký dưới link mời của đối tác đại lý MEXC Việt Nam mới đủ điều kiện nhận thưởng.</p>
        <p>Sự kiện sẽ <strong>chi trả phần thưởng dưới dạng vật lý</strong> trích từ ngân sách token được phân bổ cho sự kiện. Không thể quy đổi từ hiện vật sang USDT.</p>
        <p>Phần thưởng sẽ được <strong>phân bổ theo từng lượt tham gia hợp lệ, đúng, và nhanh nhất (FCFS).</strong></p>
        <p>Tất cả phần thưởng sẽ được phân bổ trong vòng 10 ngày làm việc sau khi sự kiện kết thúc.</p>
        <p>Nghiêm cấm thực hiện bất kỳ hành vi vi phạm nào ảnh hưởng đến sự cạnh tranh công bằng giữa những người dùng trong sự kiện, bao gồm nhưng không giới hạn ở việc giả mạo khối lượng giao dịch, đăng ký tài khoản số lượng lớn bất hợp pháp, tự giao dịch hoặc thao túng thị trường. Nếu bị phát hiện, người dùng có liên quan sẽ bị loại khỏi sự kiện.</p>
        <p>MEXC có quyền giải thích cuối cùng về các điều khoản và điều kiện này, bao gồm nhưng không giới hạn ở việc sửa đổi, thay đổi hoặc hủy bỏ các quy tắc ưu đãi mà không cần thông báo thêm. Nếu bạn có bất kỳ câu hỏi nào, xin vui lòng liên hệ với chúng tôi.</p>
        <p>Mọi thắc mắc về vấn đề tài khoản hay sự kiện, vui lòng liên hệ với BD quản lý tài khoản qua Telegram để được giải đáp.</p>
        <p>Sự kiện chỉ dành cho người dùng Việt Nam.</p>
        <p className="community-note"><ShieldCheck size={17} />Đây là hoạt động tương tác cộng đồng, không mang tính chất đầu tư hay khuyến nghị tài chính. Vui lòng cân nhắc kỹ các rủi ro trước khi tham gia.</p>
      </div>
    </section>
  );
}
