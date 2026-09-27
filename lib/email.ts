const resendApiUrl = "https://api.resend.com/emails";

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

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
        subject: "Welcome to ChopHub Calabar!",
        html: `
          <div style="font-family: Arial, sans-serif; color: #10231b;">
            <h1 style="color: #07833f;">Welcome, ${name}!</h1>
            <p>Your ChopHub account has been created. You can now order Cooked Food, Foodstuff, and Fresh Food, and track your order history anytime.</p>
            <p>Thanks for shopping with us.</p>
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
