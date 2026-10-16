export function renderVerificationEmail(params: {
  name?: string;
  verificationUrl: string;
}): { subject: string; text: string; html: string } {
  const greeting = params.name ? `Chào ${params.name},` : 'Xin chào,';
  const subject = 'Xác minh tài khoản JLPT Online';

  const text = `${greeting}

Cảm ơn bạn đã đăng ký tài khoản tại JLPT Online.
Vui lòng nhấp vào liên kết dưới đây để xác minh địa chỉ email của bạn:
${params.verificationUrl}

Liên kết này có hiệu lực trong vòng 24 giờ. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ JLPT Online
`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">JLPT Online</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">${greeting}</p>
    <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>JLPT Online</strong>.</p>
    <p>Vui lòng nhấn vào nút bên dưới để xác minh địa chỉ email của bạn:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Xác minh email</a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Hoặc sao chép đường dẫn này vào trình duyệt của bạn:<br><a href="${params.verificationUrl}" style="color: #2563eb; word-break: break-all;">${params.verificationUrl}</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Liên kết này có hiệu lực trong 24 giờ. Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

export function renderPasswordResetEmail(params: {
  name?: string;
  resetUrl: string;
}): { subject: string; text: string; html: string } {
  const greeting = params.name ? `Chào ${params.name},` : 'Xin chào,';
  const subject = 'Đặt lại mật khẩu JLPT Online';

  const text = `${greeting}

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản JLPT Online của bạn.
Vui lòng nhấp vào liên kết dưới đây để đặt mật khẩu mới:
${params.resetUrl}

LƯU Ý: Liên kết này chỉ có hiệu lực một lần duy nhất và sẽ hết hạn sau 1 giờ.
Nếu bạn không yêu cầu đặt lại mật khẩu, tài khoản của bạn vẫn an toàn và bạn có thể bỏ qua email này.

Trân trọng,
Đội ngũ JLPT Online
`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #dc2626; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">JLPT Online</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px;">${greeting}</p>
    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản JLPT Online của bạn.</p>
    <p>Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.resetUrl}" style="background-color: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Hoặc sao chép đường dẫn này vào trình duyệt của bạn:<br><a href="${params.resetUrl}" style="color: #dc2626; word-break: break-all;">${params.resetUrl}</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;"><strong>LƯU Ý QUAN TRỌNG:</strong> Liên kết này chỉ có hiệu lực một lần duy nhất và sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
