import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: "ChopHub <support@chophub.ng>",
    to: ["tonyitam@gmail.com"],
    subject: "Welcome to ChopHub! 🛒",
    html: `
      <h1>Welcome to ChopHub!</h1>
      <p>Your everyday shopping just got easier.</p>
      <p>Thanks for joining us!</p>
    `,
  });

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ success: true, data });
}