const resendApiUrl = "https://api.resend.com/emails";

type WelcomeAudience = "customer" | "vendor" | "rider";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

const welcomeMessages: Record<WelcomeAudience, { subject: string; message: string; closing: string }> = {
  customer: {
    subject: "Welcome to ChopHub Calabar!",
    message: "Your ChopHub account is ready. You can now order Cooked Food, Foodstuff, and Fresh Food, and track your order history anytime.",
    closing: "Thanks for shopping with us.",
  },
  vendor: {
    subject: "Welcome to the ChopHub vendor community",
    message: "We’ve received your vendor details. Our team will review your information and follow up about onboarding and getting your products or meals ready on ChopHub.",
    closing: "Thank you for partnering with ChopHub.",
  },
  rider: {
    subject: "Welcome to the ChopHub rider team",
    message: "We’ve received your rider application. Your account is pending ChopHub approval; we’ll follow up with you about the next steps.",
    closing: "Thank you for your interest in delivering with ChopHub.",
  },
};

export async function sendWelcomeEmail(to: string, name: string, audience: WelcomeAudience = "customer"): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const welcome = welcomeMessages[audience];

  try {
    const response = await fetch(resendApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ChopHub Calabar <hello@chophub.ng>",
        to,
        subject: welcome.subject,
        html: `
          <div style="font-family: Arial, sans-serif; color: #10231b;">
            <h1 style="color: #07833f;">Welcome, ${escapeHtml(name)}!</h1>
            <p>${welcome.message}</p>
            <p>${welcome.closing}</p>
            <p style="color: #53625d;">ChopHub Calabar</p>
          </div>
        `,
      }),
    });
    if (!response.ok) {
      console.error("Welcome email provider returned an error", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Welcome email failed", error);
    return false;
  }
}
