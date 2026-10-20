// The app receives Vietnamese messages from the root layout; tests render components without it.
import viMessages from '../messages/vi.json' with { type: 'json' };
import { registerLocaleMessages, type MessageTree } from '../lib/i18n';

registerLocaleMessages('vi', viMessages as MessageTree);
