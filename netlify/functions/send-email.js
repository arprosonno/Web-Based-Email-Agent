const { GoogleGenAI } = require('@google/genai');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { text, imageBase64, mimeType } = JSON.parse(event.body);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(response.text);
    const { recipient_email, subject, body } = parsedData;

    if (!recipient_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Could not extract a valid email address from the circular.' })
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD
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
      from: process.env.SENDER_EMAIL,
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
