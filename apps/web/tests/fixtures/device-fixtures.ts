/**
 * Mobile & Real Device Target Profiles (SYS-01, SYS-10, WCAG 2.1 AA)
 * Common fixtures for multi-device responsive & ergonomics testing.
 */

export interface DeviceProfile {
  id: string;
  name: string;
  os: string;
  browser: string;
  engine: 'WebKit' | 'Blink' | 'Gecko';
  isMobile: boolean;
  viewport: { width: number; height: number };
  touch: boolean;
  userAgent: string;
}

export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    id: 'iphone-15',
    name: 'Apple iPhone 15',
    os: 'iOS 17.5',
    browser: 'Mobile Safari 17.5',
    engine: 'WebKit',
    isMobile: true,
    viewport: { width: 393, height: 852 },
    touch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  {
    id: 'iphone-se',
    name: 'Apple iPhone SE (Compact)',
    os: 'iOS 17.5',
    browser: 'Mobile Safari 17.5',
    engine: 'WebKit',
    isMobile: true,
    viewport: { width: 320, height: 568 },
    touch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  {
    id: 'pixel-7',
    name: 'Google Pixel 7',
    os: 'Android 14',
    browser: 'Chrome Mobile 125.0',
    engine: 'Blink',
    isMobile: true,
    viewport: { width: 412, height: 915 },
    touch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
  },
  {
    id: 'ipad-pro',
    name: 'Apple iPad Pro 11-inch',
    os: 'iPadOS 17.5',
    browser: 'Mobile Safari 17.5',
    engine: 'WebKit',
    isMobile: true,
    viewport: { width: 834, height: 1194 },
    touch: true,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
  {
    id: 'galaxy-tab',
    name: 'Samsung Galaxy Tab S9',
    os: 'Android 14',
    browser: 'Chrome Mobile 125.0',
    engine: 'Blink',
    isMobile: true,
    viewport: { width: 800, height: 1280 },
    touch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Safari/537.36',
  },
  {
    id: 'desktop-mac',
    name: 'MacBook Pro 14 (Reference)',
    os: 'macOS 14.5',
    browser: 'Safari 17.5',
    engine: 'WebKit',
    isMobile: false,
    viewport: { width: 1512, height: 982 },
    touch: false,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  },
];
