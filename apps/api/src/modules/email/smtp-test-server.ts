import net from 'node:net';

export interface CapturedSmtpMessage {
  from: string;
  to: string[];
  data: string;
  subject: string;
  body: string;
}

export class SmtpTestServer {
  private server: net.Server | null = null;
  public readonly messages: CapturedSmtpMessage[] = [];
  public port = 1025;
  public host = '127.0.0.1';

  async start(port = 1025, host = '127.0.0.1'): Promise<boolean> {
    this.port = port;
    this.host = host;

    return new Promise((resolve) => {
      const s = net.createServer((socket) => {
        let state = 'GREETING';
        let buffer = '';
        let currentFrom = '';
        const currentTo: string[] = [];
        let currentData = '';

        socket.write('220 jlpt-mailpit-test ESMTP Service Ready\r\n');

        socket.on('data', (chunk) => {
          buffer += chunk.toString('utf8');

          if (state === 'DATA') {
            currentData += chunk.toString('utf8');
            if (currentData.includes('\r\n.\r\n')) {
              state = 'COMMAND';
              const subjectMatch = currentData.match(/Subject:\s*([^\r\n]+)/i);
              const subject = subjectMatch ? subjectMatch[1]?.trim() ?? '' : '';

              this.messages.push({
                from: currentFrom,
                to: [...currentTo],
                data: currentData,
                subject,
                body: currentData,
              });

              socket.write('250 2.0.0 Ok: queued\r\n');
              buffer = '';
            }
            return;
          }

          const lines = buffer.split('\r\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line) continue;
            const upper = line.toUpperCase();

            if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
              socket.write('250-jlpt-mailpit-test\r\n250 SIZE 10485760\r\n');
            } else if (upper.startsWith('MAIL FROM:')) {
              const match = line.match(/<([^>]+)>/);
              currentFrom = match ? match[1] ?? '' : line.slice(10).trim();
              socket.write('250 2.1.0 Ok\r\n');
            } else if (upper.startsWith('RCPT TO:')) {
              const match = line.match(/<([^>]+)>/);
              const rcpt = match ? match[1] ?? '' : line.slice(8).trim();
              currentTo.push(rcpt);
              socket.write('250 2.1.5 Ok\r\n');
            } else if (upper === 'DATA') {
              state = 'DATA';
              currentData = '';
              socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
            } else if (upper === 'QUIT') {
              socket.write('221 2.0.0 Bye\r\n');
              socket.end();
            } else if (upper === 'RSET') {
              currentFrom = '';
              currentTo.length = 0;
              currentData = '';
              socket.write('250 2.0.0 Ok\r\n');
            } else if (upper === 'NOOP') {
              socket.write('250 2.0.0 Ok\r\n');
            } else {
              socket.write('500 5.5.1 Command unrecognized\r\n');
            }
          }
        });
      });

      s.once('error', (err: { code?: string }) => {
        // Port might already be bound by a running Mailpit instance!
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      s.listen(port, host, () => {
        this.server = s;
        resolve(true);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  clear(): void {
    this.messages.length = 0;
  }
}
