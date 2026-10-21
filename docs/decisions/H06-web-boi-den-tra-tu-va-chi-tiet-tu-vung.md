# H06: Web: Bôi đen từ khi làm bài để xem nghĩa, cách đọc, Hán Việt, từ loại; nút Xem chi tiết; trang chi tiết từ vựng

- **Mã task**: H06
- **Worker**: W3 (Giao diện học viên)
- **Nhánh**: `task/H06`
- **Hợp đồng**: API, UI primitives (@jlpt/ui)
- **Dựa trên**: H05 (API từ điển tra nhanh và chi tiết), H02 (Tra cứu từ vựng và chi tiết), H01 (Chuẩn Hán Việt)

---

## 1. Bối cảnh và Yêu cầu

Theo chỉ thị của chủ dự án:
- Tính năng tra từ khi bôi đen chạy ở **mọi chế độ**, **kể cả THI THẬT** (`/phong-thi`), **luyện tập** (`/luyen-tap`), và **xem lại kết quả** (`/ket-qua/[id]`).
- Có công tắc "Tra từ khi bôi đen" (`Switch` từ `@jlpt/ui/components/switch`) trong thanh công cụ phòng thi (`exam-toolbar`) và luyện tập; mặc định **BẬT**; lưu trạng thái trong `localStorage` (khóa `jlpt_select_lookup`); đọc giá trị sau khi hydrate (tránh lỗi hydration React #418).
- Phạm vi bôi đen: nội dung câu hỏi, các lựa chọn, đoạn văn đọc hiểu, giải thích. **Không áp dụng** cho thanh công cụ, đồng hồ, phiếu trả lời.
- Sự kiện bôi đen:
  - Chuột: sự kiện `mouseup`.
  - Cảm ứng: sự kiện `selectionchange` có debounce 300ms.
  - Chuỗi hợp lệ: 1-20 ký tự, chứa chữ Nhật (`[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]`).
  - Tách bỏ hoàn toàn furigana (các thẻ `<rt>` và `<rp>` trong cấu trúc `<ruby>`).
- Khung nổi (Popover):
  - Dùng `Popover` / `PopoverContent` và `PopoverAnchor` với virtual reference từ `@jlpt/ui` (Radix UI / HeroUI).
  - Định vị sát vùng chọn văn bản, tự động lật (flip) lên/xuống để vừa viewport, hỗ trợ tốt trên màn hình hẹp 390px (chiều rộng tối đa `max-w-[340px]` hoặc tính theo viewport, không gây thanh cuộn ngang).
  - Nội dung: Mục từ dạng từ điển (font Nhật `font-japanese font-bold text-lg`), dạng đã bôi nếu khác (`lemma !== matchedText`), cách đọc Hiragana, âm Hán Việt (hiển thị nhãn "Đang chờ xác nhận" nếu `confidence === 'review'`, "Âm của chữ:" nếu `confidence === 'kun'`), nhãn từ loại tiếng Việt (`posLabels`), tối đa 3 nghĩa đầu với tiêu đề "Nghĩa tiếng Anh (JMdict)", nút "Xem chi tiết", dòng bản quyền EDRDG nhỏ.
  - Trạng thái: Skeleton khi đang tải, "Không tìm thấy trong từ điển" khi 404, thông báo lỗi kèm nút "Thử lại".
  - Đóng khung: Phím Esc, click ra ngoài, bỏ chọn vùng văn bản (collapse selection), hoặc khi chuyển câu hỏi.
- **Bảo vệ bài thi (Exam Safety)**:
  - Bôi đen hoặc tương tác trong Popover tuyệt đối không chọn hay đổi đáp án đang chọn.
  - Phím tắt phòng thi (1-4, F, phím mũi tên) bị chặn khi focus nằm trong khung nổi Popover hoặc modal dialog.
  - Không làm mất phiên thi, không ghi đáp án ảo.
- Nút "Xem chi tiết":
  - Trong phòng thi (`/phong-thi`) và luyện tập (`/luyen-tap`): mở tab mới tới `/tu-vung/[term]` (`target="_blank"` và `rel="noopener noreferrer"`) để không làm gián đoạn bài làm, giữ nguyên vị trí câu và đồng hồ đếm ngược.
  - Ở trang kết quả (`/ket-qua/[id]`): mở trong cùng tab.
- Trang chi tiết từ vựng `/tu-vung/[term]`:
  - Route App Router Next.js: `apps/web/app/(corpus)/tu-vung/[term]/page.tsx`, giải mã URL với `decodeURIComponent`.
  - Gọi `GET /api/v1/dictionary/entries/:term` từ H05. Nếu không tìm thấy, gọi hàm `notFound()` của Next.js để trả trang 404 chuẩn.
  - Hiển thị đầy đủ: mục từ, các cách đọc, nhãn từ loại, các nghĩa đánh số theo từng sense kèm từ loại riêng của sense, âm Hán Việt và bảng phân tách theo chữ (chữ Hán, âm On, âm Kun, số nét, nghĩa tiếng Anh, cấp JLPT), số lần xuất hiện trong đề thi theo cấp (`corpusOccurrences`), nút "Lưu vào sổ tay" và nút "Báo sai âm Hán Việt" (tái sử dụng modal từ H02), ghi chú bản quyền EDRDG dẫn tới `/gioi-thieu#nguon-du-lieu`.
  - Metadata SEO: tiêu đề `<từ> - nghĩa, cách đọc, Hán Việt | JLPT Online`, thẻ canonical và JSON-LD Breadcrumb / DefinedTerm.

---

## 2. Thiết kế và Quyết định kỹ thuật

### 2.1. Loại bỏ Furigana khi trích xuất vùng văn bản (`extractCleanSelectionText`)

Trong cấu trúc HTML của câu hỏi JLPT, chữ Hán kèm furigana thường có dạng:
```html
<ruby>学<rt>がく</rt></ruby><ruby>生<rt>せい</rt></ruby>
```
Nếu gọi `window.getSelection().toString()`, trình duyệt sẽ lấy cả nội dung thẻ `<rt>`: `"学がく生せい"`.
Để lấy đúng văn bản gốc `"学生"`:
- Thuật toán `extractCleanSelectionText(range)`:
  - Clone nội dung của `Range` thành `DocumentFragment` (`range.cloneContents()`).
  - Tìm và xóa toàn bộ các phần tử `rt` và `rp` (`fragment.querySelectorAll('rt, rp')`).
  - Lấy `textContent.trim()`.
- Hỗ trợ môi trường SSR / kiểm thử bằng cách kiểm tra sự tồn tại của `range.cloneContents`.

### 2.2. Kiểm tra điều kiện vùng chọn (`getEligibleSelection`)

Để tránh hiện popover khi người dùng thao tác ở những vùng không cho phép:
1. Độ dài chuỗi sau khi làm sạch phải từ 1 đến 20 ký tự.
2. Chuỗi phải chứa ít nhất một ký tự tiếng Nhật (Hiragana, Katakana, hoặc Kanji).
3. Vùng chọn phải nằm trong phần tử có thuộc tính `data-select-lookup-area="true"`.
4. Không nằm trong các phần tử bị cấm (như `button`, `input`, `textarea`, `[data-select-lookup-ignore="true"]`, thanh công cụ, đồng hồ).

### 2.3. Khung nổi Popover định vị theo tọa độ Virtual Anchor

Thay vì tạo một thẻ DOM vô hình tại vị trí bôi đen gây xáo trộn cây DOM của câu hỏi:
- Sử dụng thuộc tính `virtualRef` của `PopoverAnchor` (`@radix-ui/react-popover`):
  ```typescript
  const virtualRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => clientRect ?? new DOMRect(0, 0, 0, 0),
  });
  ```
- Khi người dùng bôi đen, lấy `range.getBoundingClientRect()` và gán vào `clientRect`.
- Thiết lập `side="top"`, `align="center"`, `avoidCollisions={true}`, `collisionPadding={12}`: Radix tự động lật popover xuống dưới nếu phía trên không đủ không gian và tự dịch ngang để luôn nằm trọn vẹn trong viewport 390px.
- Ngăn lan truyền phím (Escape, Enter, phím 1-4, Space) trong Popover bằng `onKeyDown={(e) => e.stopPropagation()}` để bảo vệ phím tắt phòng thi.

### 2.4. Tránh xung đột giữa sự kiện Click chọn đáp án và sự kiện Bôi đen

Khi người dùng nhấn chuột và kéo để bôi đen chữ trên nút chọn đáp án (ví dụ `<Button role="radio">`), trình duyệt vẫn có thể phát sinh sự kiện `click` khi nhả chuột (`mouseup`).
Để đáp án đang chọn không bị thay đổi ngoài ý muốn:
- Trong hàm `handleOptionClick` của `question-view.tsx` và `practice-runner.tsx`:
  ```typescript
  const selection = typeof window !== 'undefined' ? window.getSelection() : null;
  if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
    return; // Người dùng đang bôi đen để tra từ, không chọn đáp án
  }
  ```
- Nhờ cơ chế này, đáp án được giữ nguyên vẹn 100% khi bôi đen trong các lựa chọn A, B, C, D.

### 2.5. Tránh lỗi Hydration React #418 với localStorage

Để lưu và khôi phục cài đặt "Tra từ khi bôi đen":
- Mặc định trạng thái khởi tạo `enabled = true` trên cả server và client render đầu tiên.
- Khôi phục giá trị thực tế từ `localStorage.getItem('jlpt_select_lookup')` trong `useEffect`:
  ```typescript
  export function useSelectLookupSetting() {
    const [enabled, setEnabled] = useState(true);
    useEffect(() => {
      try {
        const saved = localStorage.getItem('jlpt_select_lookup');
        if (saved !== null) {
          setEnabled(saved === 'true');
        }
      } catch {
        // Safe fallback in restricted environments
      }
    }, []);
    ...
  }
  ```
- Tuyệt đối không đọc `localStorage` trong hàm khởi tạo của `useState`, đảm bảo SSR markup hoàn toàn khớp với client markup, loại bỏ hoàn toàn lỗi React Hydration #418.

### 2.6. Cache bộ nhớ Client cho API Tra nhanh

Để tối ưu trải nghiệm tra cứu tức thì khi người dùng bôi đen liên tục:
- Trong `CorpusClient`, thiết lập `static lookupCache = new Map<string, DictionaryLookupResultDto>()`.
- Khi gọi `lookupDictionary(text, locale)`:
  - Kiểm tra `lookupCache.get(key)`. Nếu đã có, trả về ngay lập tức (0ms latency, không tốn network request).
  - Nếu chưa có, gửi request tới `/api/v1/dictionary/lookup?text=${encoded}&locale=${locale}`. Khi có kết quả, lưu vào `lookupCache`.
  - Giới hạn kích thước cache (tối đa 200 mục) để tránh rò rỉ bộ nhớ.

### 2.7. Tách biệt tab khi xem chi tiết trong lúc thi

- Khi nhấn nút "Xem chi tiết" trong phòng thi (`/phong-thi`) hoặc luyện tập (`/luyen-tap`), liên kết có `target="_blank"` và `rel="noopener noreferrer"`.
- Tab bài thi hiện tại hoàn toàn không bị ảnh hưởng: vị trí câu hỏi đang làm, các đáp án đã chọn, và đồng hồ đếm ngược của phòng thi tiếp tục chạy bình thường.
- Ở trang xem lại kết quả (`/ket-qua/[id]`), nút "Xem chi tiết" mở trong cùng tab (`target="_self"` hoặc không có target) để trải nghiệm liền mạch.

### 2.8. Trang chi tiết từ vựng `/tu-vung/[term]`

- Nhận `params.term` và giải mã an toàn bằng `decodeURIComponent(params.term)`.
- Gọi `corpusClient.getEntryDetails(term)` trên server component. Nếu trả về null hoặc lỗi 404, lập tức gọi `notFound()` từ `next/navigation`.
- Hiển thị đầy đủ thông tin:
  - Đầu trang: Từ vựng, cấp JLPT, danh sách cách đọc Hiragana, âm Hán Việt tổng thể.
  - Các khối nghĩa (`senses`): Đánh số thứ tự từng sense (1, 2, 3...), kèm huy hiệu từ loại riêng của từng sense (`sense.pos` và `sense.posLabels`) và danh sách giải nghĩa tiếng Anh / Việt.
  - Bảng phân tách chữ Hán: Bảng gồm các cột Ký tự, Âm On, Âm Hán Việt, Nghĩa, Trạng thái tin cậy.
  - Thẻ thông tin chi tiết từng chữ Hán: Âm On, Âm Kun, Số nét, Cấp độ, Nghĩa.
  - Thống kê xuất hiện trong đề thi theo từng cấp (`corpusOccurrences`).
  - Hai nút hành động: "Lưu vào sổ tay" và "Báo sai âm Hán Việt" (tích hợp modal báo cáo đã hoàn thiện từ H02).
  - Phần ghi chú nguồn dữ liệu: Trích dẫn bản quyền EDRDG JMdict & KANJIDIC2 có liên kết tới `/gioi-thieu#nguon-du-lieu`.
  - SEO Metadata: Sinh tiêu đề `<từ> - nghĩa, cách đọc, Hán Việt | JLPT Online`, canonical URL và JSON-LD BreadcrumbList / DefinedTerm.

---

## 3. Kiểm thử và Nghiệm thu

1. **Unit tests (`apps/web/tests/h06-selection-lookup.test.tsx`)**:
   - 13 test case kiểm tra toàn diện:
     - `extractCleanSelectionText`: bóc tách chữ Hán, loại bỏ thẻ `<rt>` và `<rp>` furigana.
     - `getEligibleSelection`: kiểm tra giới hạn 1-20 ký tự, kiểm tra ký tự tiếng Nhật, bỏ qua các thẻ input/button/ignore.
     - `SelectionLookupPopover`: render đúng các trạng thái đang tải (Skeleton), kết quả thành công (mục từ, cách đọc, Hán Việt, từ loại, 3 nghĩa, link Xem chi tiết tab mới), không tìm thấy, và lỗi mạng.
     - `VocabDetailView`: render đầy đủ thông tin trang chi tiết từ vựng với các sense, bảng chữ Hán, số nét, corpus occurrences, bản quyền EDRDG.
2. **E2E Playwright tests (`tests/playwright/integration.spec.ts`)**:
   - Thêm bộ test `H06: Selection lookup & vocabulary detail` bao phủ trọn vẹn AC1 đến AC10:
     - Bôi đen trong phòng thi thật hiện Popover với thông tin chính xác, không thay đổi đáp án đang chọn.
     - Công tắc bật/tắt hoạt động, ghi nhớ trong localStorage sau khi reload trang.
     - Bấm "Xem chi tiết" mở tab mới tới `/tu-vung/学生`, tab bài thi giữ nguyên câu và thời gian.
     - Trang `/tu-vung/学生` tải dữ liệu thật đầy đủ; truy cập `/tu-vung/tuvungkhongtontaixyz999` trả trang 404.
     - Bôi đen trong luyện tập và trang kết quả hoạt động tốt; bấm ra ngoài hoặc Esc đóng Popover.
     - Responsive tại viewport 390px không tràn ngang, không phát sinh lỗi hydration trong console.
     - Đa ngôn ngữ đầy đủ trên cả ba locale `vi`, `ja`, `en`, không sót translation key thô.
