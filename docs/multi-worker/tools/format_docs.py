"""Normalize spacing in authored Markdown, preserving code fences and sources."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

for path in ROOT.rglob('*.md'):
    if 'nguon' in path.relative_to(ROOT).parts:
        continue
    parts=re.split(r'(```.*?```)',path.read_text(encoding='utf-8'),flags=re.S)
    for i in range(0,len(parts),2):
        p=parts[i]
        p=re.sub(r'(?<=\d)(?=(?:tính|mã|ngày|giờ|tuần|worker|phiên|nhóm|phân|tài|chế|đề|feature|task|browser|prefix|gói|điều|cổng|bản|lần|mẫu|câu|kỹ|yêu|đầu|lựa|ô|file))',' ',p)
        p=re.sub(r'\b(ngày|giờ|tuần|nhóm|task|worker|lệnh|có|đủ|bộ|trong|thứ|sau|đến|trước|gồm|cùng|lịch|trên|dưới|hơn|khoảng|và|cần|bằng|nhận|của|các|từ|mỗi|tục)(?=\d)',r'\1 ',p,flags=re.I)
        p=re.sub(r',(?=[A-Za-zÀ-ỹ])',', ',p)
        p=re.sub(r';(?=[A-Za-zÀ-ỹ])','; ',p)
        p=p.replace('chưađạt','chưa đạt').replace('khôngtồn tại','không tồn tại')
        parts[i]=p
    path.write_text(''.join(parts),encoding='utf-8')
