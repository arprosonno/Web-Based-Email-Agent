const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { text, imageBase64, mimeType } = JSON.parse(event.body);

    // Initialize Gemini Client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const contents = [];
    if (imageBase64 && mimeType) {
      contents.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      });
    }

    contents.push({
      text: `You are an academic outreach agent for Asjad Ruhullah (Computer Science & Engineering student at GSTU).
Analyze the provided circular content (text/image) and return a JSON object ONLY with the following keys:
- "recipient_email": The professor's or contact email address found in the circular.
- "subject": A formal subject line expressing interest in the opportunity.
- "body": A formal, well-structured cover email. Mention that "Asjad Ruhullah CV.pdf" is attached.

Additional Text Input: ${text || "None provided"}`
    });

    const result = await model.generateContent(contents);
    const response = await result.response;
    const parsedData = JSON.parse(response.text());
    const { recipient_email, subject, body } = parsedData;

    if (!recipient_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Could not extract a valid email address from the circular.' })
      };
    }

    // Configure Nodemailer using OAuth2
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.SENDER_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      }
    });

    const cvPath = path.join(__dirname, '../../assets/Asjad Ruhullah CV.pdf');
    const attachments = [];

    if (fs.existsSync(cvPath)) {
      attachments.push({
        filename: 'Asjad Ruhullah CV.pdf',
        path: cvPath
      });
    }

    await transporter.sendMail({
      from: `Asjad Ruhullah <${process.env.SENDER_EMAIL}>`,
      to: recipient_email,
      subject: subject,
      text: body,
      attachments: attachments
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email successfully sent!',
        recipient: recipient_email,
        subject: subject
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
