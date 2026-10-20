// The app loads ja/en on demand; tests that render or assert other locales need them up front.
import jaMessages from '../messages/ja.json';
import enMessages from '../messages/en.json';
import { registerLocaleMessages } from '../lib/i18n';

registerLocaleMessages('ja', jaMessages);
registerLocaleMessages('en', enMessages);
