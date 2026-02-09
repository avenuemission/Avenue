import nodemailer from "nodemailer";

export const ADMIN_EMAIL = "henrymcmahon@avenuemission.com";
const FROM_EMAIL = `Avenue Mission <${process.env.GMAIL_USER}>`;

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Base email wrapper using background image for mobile compatibility
export const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if gte mso 9]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
      <tr>
        <td align="center" background="https://www.avenuemission.com/images/black_image.png" style="background-image: url('https://www.avenuemission.com/images/black_image.png'); background-color: #000000; background-size: cover; background-position: center;">
          <!--[if gte mso 9]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:800px;">
            <v:fill type="tile" src="https://www.avenuemission.com/images/black_image.png" color="#000000"/>
            <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
          <![endif]-->
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding-bottom: 40px;">
                  <img src="https://www.avenuemission.com/images/Avenue.png" alt="Avenue" width="180" style="display: block; max-width: 180px; height: auto;" />
                </td>
              </tr>
              <!-- Content Card -->
              <tr>
                <td>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255, 255, 255, 0.1); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <tr>
                      <td style="padding: 40px 30px;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 40px;">
                  <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Avenue Mission. All rights reserved.
                  </p>
                  <p style="color: rgba(255, 255, 255, 0.4); font-size: 11px; margin: 10px 0 0 0;">
                    <a href="https://www.avenuemission.com" style="color: rgba(255, 255, 255, 0.4); text-decoration: none;">www.avenuemission.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </div>
          <!--[if gte mso 9]>
            </v:textbox>
          </v:rect>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>
`;

// Send email helper
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Email service not configured - missing GMAIL_USER or GMAIL_APP_PASSWORD");
    return;
  }

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

// Admin notification template
export function getAdminNotificationEmail(title: string, details: Record<string, string>): { subject: string; html: string } {
  const detailRows = Object.entries(details)
    .map(
      ([key, value]) => `
        <tr>
          <td style="color: rgba(255, 255, 255, 0.6); font-size: 14px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            ${key.charAt(0).toUpperCase() + key.slice(1)}
          </td>
          <td style="color: #ffffff; font-size: 14px; padding: 8px 0; padding-left: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            ${value}
          </td>
        </tr>
      `
    )
    .join("");

  return {
    subject: `Avenue: ${title}`,
    html: emailWrapper(`
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
        ${title}
      </h1>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
        ${detailRows}
      </table>
      <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin: 30px 0 0 0; text-align: center;">
        Submitted on ${new Date().toLocaleDateString("en-AU", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    `),
  };
}

// Send leader signup notification
export async function sendLeaderSignupNotification(name: string, email: string): Promise<void> {
  const template = getAdminNotificationEmail("New Leader Account Created", {
    name,
    email,
  });
  await sendEmail(ADMIN_EMAIL, template.subject, template.html);
}
