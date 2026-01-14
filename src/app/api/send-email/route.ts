import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ADMIN_EMAIL = "henrymcmahon@avenuemission.com";
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
const emailWrapper = (content: string) => `
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
                <td style="background-color: #0a0f1a; border-radius: 12px; padding: 40px; border: 1px solid #1e3a5f;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 40px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Avenue Mission<br>
                    <a href="https://www.avenuemission.com" style="color: #3b82f6; text-decoration: none;">www.avenuemission.com</a>
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

// Email templates
const emailTemplates = {
  joinPathway: (name: string, group: string) => ({
    subject: "Welcome to Avenue - Pathway Group Connection",
    html: emailWrapper(`
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Welcome, ${name}!</h2>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for your interest in joining the <strong style="color: #3b82f6;">${group}</strong> pathway group.
      </p>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        A member of our team will be in contact with you soon to help you get connected. We're excited to have you join our community!
      </p>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
        In the meantime, feel free to explore our website and learn more about Avenue.
      </p>
    `),
  }),

  startPathway: (name: string, email: string, suburb: string) => ({
    subject: "Your Journey Begins - Starting a Pathway Group",
    html: emailWrapper(`
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Thank you, ${name}!</h2>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for accepting God's call to grow His kingdom by starting a pathway group${suburb ? ` in <strong style="color: #3b82f6;">${suburb}</strong>` : ""}. This is an exciting step of faith!
      </p>
      <h3 style="color: #ffffff; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Your next steps:</h3>
      <ol style="color: #d1d5db; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Create an account at <a href="https://www.avenuemission.com/login" style="color: #3b82f6; text-decoration: none;">avenuemission.com/login</a></li>
        <li style="margin-bottom: 10px;">Schedule a call with our team</li>
        <li style="margin-bottom: 10px;">Watch the Avenue video guides</li>
        <li style="margin-bottom: 10px;">Make a list of people in your life that you can invite and BLESS, and begin praying for them</li>
      </ol>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        We'll be in touch soon to support you on this journey. If you have any questions, feel free to reach out to us at <a href="mailto:info@avenuemission.com" style="color: #3b82f6; text-decoration: none;">info@avenuemission.com</a>.
      </p>
    `),
  }),

  eventUpdates: (email: string) => ({
    subject: "You're in the loop - Avenue Event Updates",
    html: emailWrapper(`
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">You're in the loop!</h2>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for wanting to stay up to date with Avenue events and news. We're excited to keep you informed about what's happening in our community.
      </p>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We look forward to meeting you at one of our upcoming events!
      </p>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
        In the meantime, check out our <a href="https://www.avenuemission.com/intersection" style="color: #3b82f6; text-decoration: none;">Intersection page</a> to see what events are coming up.
      </p>
    `),
  }),

  apestResults: (name: string, results: Record<string, number>, personalizedMessage: string) => {
    const sortedResults = Object.entries(results)
      .sort(([, a], [, b]) => b - a)
      .map(([role, percentage]) => `<li style="margin-bottom: 8px;"><strong style="text-transform: capitalize;">${role}:</strong> ${percentage}%</li>`)
      .join("");

    return {
      subject: "Your APEST Quiz Results - Discover Your Gifts",
      html: emailWrapper(`
        <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">${name ? `${name}, here` : "Here"} are your APEST results!</h2>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for taking the APEST Quiz. Understanding your spiritual gifts is an important step in discovering how God has uniquely equipped you to serve.
        </p>
        <h3 style="color: #ffffff; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Your results:</h3>
        <ul style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; padding-left: 20px; list-style: none;">
          ${sortedResults}
        </ul>
        <div style="background-color: #1e3a5f; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">Your personalized insights:</h3>
          <p style="color: #d1d5db; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-line;">
            ${personalizedMessage}
          </p>
        </div>
        <h3 style="color: #ffffff; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">What's next?</h3>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your unique gifting is exactly what's needed to grow the kingdom of God. Consider using your gifts by:
        </p>
        <ul style="color: #d1d5db; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;"><a href="https://www.avenuemission.com/pathways" style="color: #3b82f6; text-decoration: none;">Joining a Pathway Group</a> to grow in community</li>
          <li style="margin-bottom: 8px;"><a href="https://www.avenuemission.com/pathways" style="color: #3b82f6; text-decoration: none;">Starting a Pathway Group</a> to lead others</li>
        </ul>
      `),
    };
  },

  leaderSupport: (leaderName: string, formattedDate: string, zoomLink: string, meetingId: string, passcode: string) => ({
    subject: "Leader Support Call Confirmed - Avenue",
    html: emailWrapper(`
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Call Confirmed!</h2>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${leaderName}, your leader support call has been scheduled for:
      </p>
      <div style="background-color: #1e3a5f; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">${formattedDate}</p>
      </div>
      <h3 style="color: #ffffff; font-size: 18px; margin: 30px 0 15px 0; font-weight: 600;">Zoom Details</h3>
      <div style="background-color: #0a0f1a; border-radius: 8px; padding: 20px; border: 1px solid #1e3a5f;">
        <p style="color: #d1d5db; font-size: 14px; margin: 0 0 10px 0;">
          <strong style="color: #9ca3af;">Join Link:</strong><br>
          <a href="${zoomLink}" style="color: #3b82f6; text-decoration: none; word-break: break-all;">${zoomLink}</a>
        </p>
        <p style="color: #d1d5db; font-size: 14px; margin: 0 0 10px 0;">
          <strong style="color: #9ca3af;">Meeting ID:</strong> ${meetingId}
        </p>
        <p style="color: #d1d5db; font-size: 14px; margin: 0;">
          <strong style="color: #9ca3af;">Passcode:</strong> ${passcode}
        </p>
      </div>
      <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0 0;">
        Please ensure your device has a microphone and webcam ready.
      </p>
      <p style="color: #9ca3af; font-size: 14px; margin: 15px 0 0 0;">
        Need to rebook or cancel? Contact us at <a href="mailto:info@avenuemission.com" style="color: #3b82f6; text-decoration: none;">info@avenuemission.com</a>
      </p>
    `),
  }),

  leaderSupportCustom: (leaderName: string, requestedDate: string, requestedTime: string) => ({
    subject: "Custom Time Request Received - Avenue Leader Support",
    html: emailWrapper(`
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Request Received!</h2>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${leaderName}, we've received your request for a custom support call time.
      </p>
      <div style="background-color: #1e3a5f; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 5px 0;">Requested Time:</p>
        <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">${requestedDate} at ${requestedTime}</p>
      </div>
      <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
        We'll be in touch shortly to confirm this time or suggest an alternative.
      </p>
    `),
  }),

  adminNotification: (formType: string, data: Record<string, string>) => {
    const dataRows = Object.entries(data)
      .map(([key, value]) => `<tr><td style="padding: 10px; border-bottom: 1px solid #1e3a5f; color: #9ca3af; text-transform: capitalize;">${key}</td><td style="padding: 10px; border-bottom: 1px solid #1e3a5f; color: #ffffff;">${value}</td></tr>`)
      .join("");

    return {
      subject: `New Form Submission: ${formType}`,
      html: emailWrapper(`
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Admin Notification</p>
        <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">New ${formType} submission</h2>
        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 20px 0;">
          Submitted on ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          ${dataRows}
        </table>
      `),
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const emails: Promise<unknown>[] = [];

    // Helper function to send email via Nodemailer
    const sendEmail = (to: string, subject: string, html: string) => {
      return transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
    };

    switch (type) {
      case "joinPathway": {
        const { name, phone, group, email } = data;
        
        // Send user email
        if (email) {
          const template = emailTemplates.joinPathway(name, group);
          emails.push(sendEmail(email, template.subject, template.html));
        }
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("Join Pathway Group", { name, phone, group, email: email || "Not provided" });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "startPathway": {
        const { name, email, phone, suburb } = data;
        
        // Send user email
        const template = emailTemplates.startPathway(name, email, suburb);
        emails.push(sendEmail(email, template.subject, template.html));
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("Start Pathway Group", { name, email, phone, suburb });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "eventUpdates": {
        const { email } = data;
        
        // Send user email
        const template = emailTemplates.eventUpdates(email);
        emails.push(sendEmail(email, template.subject, template.html));
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("Event Updates Signup", { email });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "apestResults": {
        const { name, email, results, personalizedMessage } = data;
        
        // Send user email
        const template = emailTemplates.apestResults(name, results, personalizedMessage);
        emails.push(sendEmail(email, template.subject, template.html));
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("APEST Quiz Results", { 
          name: name || "Not provided", 
          email,
          ...Object.fromEntries(Object.entries(results).map(([k, v]) => [k, `${v}%`]))
        });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "ideaSubmission": {
        const { name, email, idea } = data;
        
        // Send admin notification only
        const adminTemplate = emailTemplates.adminNotification("Idea Submission", { 
          name: name || "Anonymous", 
          email: email || "Not provided", 
          idea 
        });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "leaderSupport": {
        const { leaderName, leaderEmail, formattedDate, zoomLink, meetingId, passcode } = data;
        
        // Send confirmation email to leader
        const template = emailTemplates.leaderSupport(leaderName, formattedDate, zoomLink, meetingId, passcode);
        if (leaderEmail) {
          emails.push(sendEmail(leaderEmail, template.subject, template.html));
        }
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("Leader Support Call Booking", { 
          leader: leaderName,
          email: leaderEmail || "Not provided",
          scheduledTime: formattedDate,
        });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      case "leaderSupportCustom": {
        const { leaderName, leaderEmail, requestedDate, requestedTime } = data;
        
        // Send confirmation email to leader
        const template = emailTemplates.leaderSupportCustom(leaderName, requestedDate, requestedTime);
        if (leaderEmail) {
          emails.push(sendEmail(leaderEmail, template.subject, template.html));
        }
        
        // Send admin notification
        const adminTemplate = emailTemplates.adminNotification("Leader Support - Custom Time Request", { 
          leader: leaderName,
          email: leaderEmail || "Not provided",
          requestedDate,
          requestedTime,
        });
        emails.push(sendEmail(ADMIN_EMAIL, adminTemplate.subject, adminTemplate.html));
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    await Promise.all(emails);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
