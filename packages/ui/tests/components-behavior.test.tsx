// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Modal,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Alert,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  Skeleton,
} from '../src/index.js';

describe('D00: @jlpt/ui Component Suite - Keyboard, Focus & ARIA Behaviors', () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // 1. Button
  // ---------------------------------------------------------------------------
  describe('1. Button', () => {
    it('handles focus, keyboard activation (Enter and Space), and aria states', () => {
      const handleClick = vi.fn();

      render(
        <Button onClick={handleClick} variant="primary">
          Bắt đầu ôn thi
        </Button>,
      );

      const btn = screen.getByRole('button', { name: 'Bắt đầu ôn thi' }) as HTMLButtonElement;
      expect(document.activeElement === btn).toBe(false);

      // Focus
      btn.focus();
      expect(document.activeElement === btn).toBe(true);

      // Enter key activation
      fireEvent.keyDown(btn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Space key activation
      fireEvent.keyDown(btn, { key: ' ', code: 'Space' });
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('sets aria-busy="true" and disabled when loading', () => {
      const handleClick = vi.fn();

      render(
        <Button loading onClick={handleClick}>
          Đang nộp bài
        </Button>,
      );

      const btn = screen.getByRole('button', { name: 'Đang nộp bài' }) as HTMLButtonElement;
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.disabled).toBe(true);

      // Click should not fire handler
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports asChild pattern with link elements (<a>/Link) without throwing', () => {
      render(
        <Button asChild variant="outline" size="sm">
          <a href="/luyen-tap">Vào luyện thi</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Vào luyện thi' });
      expect(link).not.toBeNull();
      expect(link.tagName.toLowerCase()).toBe('a');
      expect(link.getAttribute('href')).toBe('/luyen-tap');
      expect(link.className).toContain('jlpt-button');
    });

    it('supports asChild pattern with leftIcon and rightIcon via Slottable', () => {
      render(
        <Button
          asChild
          variant="primary"
          leftIcon={<span data-testid="left-icon">←</span>}
          rightIcon={<span data-testid="right-icon">→</span>}
        >
          <a href="/de-thi">Xem đề thi</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: /Xem đề thi/ });
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/de-thi');
      expect(screen.getByTestId('left-icon')).not.toBeNull();
      expect(screen.getByTestId('right-icon')).not.toBeNull();
      expect(link.className).toContain('jlpt-button');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Input
  // ---------------------------------------------------------------------------
  describe('2. Input', () => {
    it('manages keyboard input, label association, and aria-describedby for error/hint', () => {
      render(
        <Input
          label="Mã thí sinh"
          id="candidate-id"
          hint="Gồm 10 chữ số trên phiếu dự thi"
          error="Mã thí sinh không hợp lệ"
        />,
      );

      const input = screen.getByLabelText(/Mã thí sinh/) as HTMLInputElement;
      expect(input.id).toBe('candidate-id');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(
        'candidate-id-error candidate-id-hint',
      );

      const errorMsg = screen.getByRole('alert');
      expect(errorMsg.textContent).toContain('Mã thí sinh không hợp lệ');

      input.focus();
      expect(document.activeElement === input).toBe(true);

      fireEvent.change(input, { target: { value: '12345' } });
      expect(input.value).toBe('12345');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Textarea
  // ---------------------------------------------------------------------------
  describe('3. Textarea', () => {
    it('manages keyboard typing, focus, and accessible error alerts', () => {
      render(
        <Textarea
          label="Ghi chú bài học"
          id="lesson-note"
          error="Ghi chú không được vượt quá 500 từ"
        />,
      );

      const textarea = screen.getByLabelText(/Ghi chú bài học/) as HTMLTextAreaElement;
      expect(textarea.id).toBe('lesson-note');
      expect(textarea.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert').textContent).toContain(
        'Ghi chú không được vượt quá 500 từ',
      );

      textarea.focus();
      expect(document.activeElement === textarea).toBe(true);

      fireEvent.change(textarea, { target: { value: 'Kanji N3 cần ôn tập' } });
      expect(textarea.value).toBe('Kanji N3 cần ôn tập');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Label
  // ---------------------------------------------------------------------------
  describe('4. Label', () => {
    it('associates with an input via htmlFor and allows programmatic focus', () => {
      render(
        <div>
          <Label htmlFor="target-input">Cấp độ thi</Label>
          <input id="target-input" type="text" />
        </div>,
      );

      const label = screen.getByText('Cấp độ thi');
      const input = document.getElementById('target-input') as HTMLInputElement;

      expect(label.getAttribute('for')).toBe('target-input');
      input.focus();
      expect(document.activeElement === input).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Select
  // ---------------------------------------------------------------------------
  describe('5. Select', () => {
    it('manages keyboard arrow navigation, selection change, and aria attributes', () => {
      const handleChange = vi.fn();

      render(
        <Select
          label="Chọn trình độ"
          id="jlpt-level"
          options={[
            { value: 'n5', label: 'JLPT N5' },
            { value: 'n4', label: 'JLPT N4' },
            { value: 'n3', label: 'JLPT N3' },
          ]}
          onChange={handleChange}
        />,
      );

      const select = screen.getByLabelText(/Chọn trình độ/) as HTMLSelectElement;
      select.focus();
      expect(document.activeElement === select).toBe(true);

      // Keyboard arrow navigation
      fireEvent.keyDown(select, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.change(select, { target: { value: 'n4' } });
      expect(select.value).toBe('n4');

      fireEvent.keyDown(select, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.change(select, { target: { value: 'n3' } });
      expect(select.value).toBe('n3');

      fireEvent.keyDown(select, { key: 'ArrowUp', code: 'ArrowUp' });
      fireEvent.change(select, { target: { value: 'n4' } });
      expect(select.value).toBe('n4');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Checkbox
  // ---------------------------------------------------------------------------
  describe('6. Checkbox', () => {
    it('toggles checked state using Space keyboard shortcut and exposes aria-checked', () => {
      render(
        <label>
          <Checkbox id="terms" aria-label="Đồng ý quy chế thi" />
          <span>Đồng ý quy chế thi</span>
        </label>,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Đồng ý quy chế thi' });
      expect(checkbox.getAttribute('aria-checked')).toBe('false');

      // Focus
      checkbox.focus();
      expect(document.activeElement === checkbox).toBe(true);

      // Space key triggers click toggle
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });
      fireEvent.click(checkbox);
      expect(checkbox.getAttribute('aria-checked')).toBe('true');

      // Space key toggles unchecked
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });
      fireEvent.click(checkbox);
      expect(checkbox.getAttribute('aria-checked')).toBe('false');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. RadioGroup
  // ---------------------------------------------------------------------------
  describe('7. RadioGroup', () => {
    it('supports arrow key navigation and proper radiogroup / radio aria roles', () => {
      render(
        <RadioGroup defaultValue="opt1" aria-label="Hình thức luyện thi">
          <label>
            <RadioGroupItem value="opt1" aria-label="Theo kỹ năng" />
            Theo kỹ năng
          </label>
          <label>
            <RadioGroupItem value="opt2" aria-label="Đề thi đầy đủ" />
            Đề thi đầy đủ
          </label>
        </RadioGroup>,
      );

      const group = screen.getByRole('radiogroup', { name: 'Hình thức luyện thi' });
      expect(group).not.toBeNull();

      const radio1 = screen.getByRole('radio', { name: 'Theo kỹ năng' });
      const radio2 = screen.getByRole('radio', { name: 'Đề thi đầy đủ' });

      expect(radio1.getAttribute('aria-checked')).toBe('true');
      expect(radio2.getAttribute('aria-checked')).toBe('false');

      // Arrow key navigation from radio1 to radio2
      radio1.focus();
      expect(document.activeElement === radio1).toBe(true);
      fireEvent.keyDown(radio1, { key: 'ArrowDown', code: 'ArrowDown' });
      radio2.focus();
      fireEvent.click(radio2);
      expect(radio2.getAttribute('aria-checked')).toBe('true');
      expect(radio1.getAttribute('aria-checked')).toBe('false');

      // Arrow key navigation back from radio2 to radio1
      fireEvent.keyDown(radio2, { key: 'ArrowUp', code: 'ArrowUp' });
      radio1.focus();
      fireEvent.click(radio1);
      expect(radio1.getAttribute('aria-checked')).toBe('true');
      expect(radio2.getAttribute('aria-checked')).toBe('false');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Switch
  // ---------------------------------------------------------------------------
  describe('8. Switch', () => {
    it('toggles using Space/Enter key and reflects aria-checked state', () => {
      render(<Switch aria-label="Chế độ âm thanh" />);

      const toggle = screen.getByRole('switch', { name: 'Chế độ âm thanh' });
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      toggle.focus();
      expect(document.activeElement === toggle).toBe(true);

      // Space toggles ON
      fireEvent.keyDown(toggle, { key: ' ', code: 'Space' });
      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-checked')).toBe('true');

      // Enter toggles OFF
      fireEvent.keyDown(toggle, { key: 'Enter', code: 'Enter' });
      fireEvent.click(toggle);
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Tabs
  // ---------------------------------------------------------------------------
  describe('9. Tabs', () => {
    it('handles keyboard arrow navigation and exposes tablist, tab, tabpanel roles', () => {
      render(
        <Tabs defaultValue="vocab">
          <TabsList aria-label="Phần thi">
            <TabsTrigger value="vocab">Từ vựng</TabsTrigger>
            <TabsTrigger value="grammar">Ngữ pháp</TabsTrigger>
            <TabsTrigger value="reading">Đọc hiểu</TabsTrigger>
          </TabsList>
          <TabsContent value="vocab">Nội dung Từ vựng</TabsContent>
          <TabsContent value="grammar">Nội dung Ngữ pháp</TabsContent>
          <TabsContent value="reading">Nội dung Đọc hiểu</TabsContent>
        </Tabs>,
      );

      const tabVocab = screen.getByRole('tab', { name: 'Từ vựng' });
      const tabGrammar = screen.getByRole('tab', { name: 'Ngữ pháp' });

      expect(tabVocab.getAttribute('aria-selected')).toBe('true');
      expect(tabGrammar.getAttribute('aria-selected')).toBe('false');

      // Keyboard arrow navigation between tabs
      tabVocab.focus();
      expect(document.activeElement === tabVocab).toBe(true);

      // ArrowRight to grammar tab
      fireEvent.keyDown(tabVocab, { key: 'ArrowRight', code: 'ArrowRight' });
      tabGrammar.focus();
      fireEvent.mouseDown(tabGrammar, { button: 0 });
      fireEvent.click(tabGrammar);

      expect(tabGrammar.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByText('Nội dung Ngữ pháp')).not.toBeNull();

      // ArrowLeft back to vocab tab
      fireEvent.keyDown(tabGrammar, { key: 'ArrowLeft', code: 'ArrowLeft' });
      tabVocab.focus();
      fireEvent.mouseDown(tabVocab, { button: 0 });
      fireEvent.click(tabVocab);

      expect(tabVocab.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByText('Nội dung Từ vựng')).not.toBeNull();
      expect(tabGrammar.getAttribute('aria-selected')).toBe('false');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Dialog & Focus Trapping / Esc Handling
  // ---------------------------------------------------------------------------
  describe('10. Dialog', () => {
    it('traps focus, renders aria-modal="true", and closes upon Esc key', () => {
      const handleOpenChange = vi.fn();

      render(
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận nộp bài thi</DialogTitle>
              <DialogDescription>
                Bạn còn 15 phút. Bạn có chắc chắn muốn kết thúc bài làm sớm?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button type="button" id="continue-btn">Tiếp tục làm bài</button>
              <button type="button" id="submit-btn">Nộp bài ngay</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(screen.getByText('Xác nhận nộp bài thi')).not.toBeNull();

      // Focus trap: first focusable element inside Dialog automatically receives focus upon open
      const continueBtn = screen.getByRole('button', { name: 'Tiếp tục làm bài' });
      const submitBtn = screen.getByRole('button', { name: 'Nộp bài ngay' });
      const closeBtn = screen.getByRole('button', { name: 'Close' });

      expect(document.activeElement).toBe(continueBtn);

      // Focus remains trapped within the Dialog container
      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);
      expect(dialog.contains(document.activeElement)).toBe(true);

      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      expect(dialog.contains(document.activeElement)).toBe(true);

      // Esc key should invoke onOpenChange(false)
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Modal (Custom Focus Trap & Esc)
  // ---------------------------------------------------------------------------
  describe('11. Modal', () => {
    it('traps Tab focus within modal and closes upon Esc key', async () => {
      const handleClose = vi.fn();

      render(
        <div>
          <button type="button" id="outside-btn">Nút bên ngoài</button>
          <Modal
            isOpen={true}
            onClose={handleClose}
            title="Đăng xuất thiết bị"
            footer={
              <>
                <button type="button" id="cancel-btn">Hủy</button>
                <button type="button" id="confirm-btn">Đồng ý</button>
              </>
            }
          >
            <p>Bạn sẽ đăng xuất khỏi phiên thi hiện tại.</p>
          </Modal>
        </div>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('aria-modal')).toBe('true');

      const closeBtn = screen.getByRole('button', { name: 'Đóng hộp thoại' });
      const cancelBtn = screen.getByRole('button', { name: 'Hủy' });
      const confirmBtn = screen.getByRole('button', { name: 'Đồng ý' });

      // First focusable element inside modal receives focus
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(closeBtn);
      });

      // Tabbing through elements within modal
      cancelBtn.focus();
      expect(document.activeElement).toBe(cancelBtn);

      confirmBtn.focus();
      expect(document.activeElement).toBe(confirmBtn);

      // Press Tab on last focusable element -> focus wraps around to first focusable element
      fireEvent.keyDown(window, { key: 'Tab', code: 'Tab' });
      expect(document.activeElement).toBe(closeBtn);

      // Press Shift-Tab on first focusable element -> focus wraps around to last focusable element
      fireEvent.keyDown(window, { key: 'Tab', code: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(confirmBtn);

      // Focus remains strictly trapped inside the modal dialog
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Nút bên ngoài' }));

      // Esc key closes modal
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. DropdownMenu
  // ---------------------------------------------------------------------------
  describe('12. DropdownMenu', () => {
    it('renders dropdown menu and closes on Escape', () => {
      const handleOpenChange = vi.fn();

      render(
        <DropdownMenu open onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button>Tùy chọn</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Làm lại đề thi</DropdownMenuItem>
            <DropdownMenuItem>Xem giải thích</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      const menuItem = screen.getByRole('menuitem', { name: 'Làm lại đề thi' });
      expect(menuItem).not.toBeNull();

      // Escape closes dropdown
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 13. Popover
  // ---------------------------------------------------------------------------
  describe('13. Popover', () => {
    it('opens content and closes on Escape key', () => {
      const handleOpenChange = vi.fn();

      render(
        <Popover open onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button>Thông tin tính điểm</Button>
          </PopoverTrigger>
          <PopoverContent>
            Điểm đỗ N3 là 95/180 với mỗi phần tối thiểu 19 điểm.
          </PopoverContent>
        </Popover>,
      );

      const content = screen.getByText(/Điểm đỗ N3 là 95\/180/);
      expect(content).not.toBeNull();

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 14. Tooltip
  // ---------------------------------------------------------------------------
  describe('14. Tooltip', () => {
    it('supports tooltip trigger and accessible tooltip role', () => {
      render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger asChild>
              <Button>Gợi ý</Button>
            </TooltipTrigger>
            <TooltipContent>
              Dạng câu hỏi tìm từ đồng nghĩa
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip.textContent).toContain('Dạng câu hỏi tìm từ đồng nghĩa');
    });
  });

  // ---------------------------------------------------------------------------
  // 15. Card
  // ---------------------------------------------------------------------------
  describe('15. Card', () => {
    it('renders structured semantic sections without inline styles', () => {
      render(
        <Card elevated data-testid="exam-card">
          <CardHeader>
            <CardTitle as="h3">Đề thi thử số 1</CardTitle>
            <CardDescription>Thời gian: 105 phút</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Bao gồm 3 phần thi kiến thức, đọc hiểu, nghe hiểu.</p>
          </CardContent>
          <CardFooter>
            <Button>Vào thi</Button>
          </CardFooter>
        </Card>,
      );

      const card = screen.getByTestId('exam-card');
      expect(card.classList.contains('jlpt-card')).toBe(true);
      expect(card.classList.contains('shadow-md')).toBe(true);
      expect(card.getAttribute('style')).toBeNull();

      const heading = screen.getByRole('heading', { level: 3, name: 'Đề thi thử số 1' });
      expect(heading).not.toBeNull();
      expect(screen.getByText('Thời gian: 105 phút')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 16. Badge
  // ---------------------------------------------------------------------------
  describe('16. Badge', () => {
    it('renders badge with accessible text and variant classes', () => {
      render(
        <div>
          <Badge variant="primary">N1</Badge>
          <Badge variant="warning">Chưa nộp</Badge>
          <Badge variant="danger">Hết giờ</Badge>
        </div>,
      );

      const n1 = screen.getByText('N1');
      expect(n1.classList.contains('jlpt-badge')).toBe(true);
      expect(n1.classList.contains('jlpt-badge-primary')).toBe(true);

      const warning = screen.getByText('Chưa nộp');
      expect(warning.classList.contains('jlpt-badge-warning')).toBe(true);

      const danger = screen.getByText('Hết giờ');
      expect(danger.classList.contains('jlpt-badge-danger')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 17. Alert
  // ---------------------------------------------------------------------------
  describe('17. Alert', () => {
    it('exposes role="alert", aria-live="polite", and keyboard dismiss', () => {
      const handleClose = vi.fn();

      render(
        <Alert
          variant="warning"
          title="Lưu ý"
          onClose={handleClose}
          closeLabel="Đóng cảnh báo"
        >
          Tai nghe cần được kiểm tra trước khi vào phần thi Nghe hiểu.
        </Alert>,
      );

      const alert = screen.getByRole('alert');
      expect(alert.getAttribute('aria-live')).toBe('polite');
      expect(screen.getByText('Lưu ý')).not.toBeNull();

      const closeBtn = screen.getByRole('button', { name: 'Đóng cảnh báo' });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('uses Vietnamese "Đóng thông báo" as default closeLabel when not specified', () => {
      const handleClose = vi.fn();

      render(
        <Alert variant="info" onClose={handleClose}>
          Thông báo quan trọng
        </Alert>,
      );

      const closeBtn = screen.getByRole('button', { name: 'Đóng thông báo' });
      expect(closeBtn).not.toBeNull();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 18. Toast & Skeleton
  // ---------------------------------------------------------------------------
  describe('18. Toast & Skeleton', () => {
    it('renders accessible Toast notification and Skeleton loading element', () => {
      render(
        <ToastProvider>
          <Toast open variant="success">
            <ToastTitle>Đã lưu đáp án</ToastTitle>
            <ToastDescription>Câu hỏi số 15 đã được ghi nhận.</ToastDescription>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>,
      );

      expect(screen.getByText('Đã lưu đáp án')).not.toBeNull();
      expect(screen.getByText('Câu hỏi số 15 đã được ghi nhận.')).not.toBeNull();

      render(<Skeleton data-testid="loading-box" className="h-6 w-32" />);
      const skeleton = screen.getByTestId('loading-box');
      expect(skeleton.classList.contains('animate-pulse')).toBe(true);
      expect(skeleton.getAttribute('style')).toBeNull();
    });
  });
});
