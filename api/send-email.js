export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the form data from the request body
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Send an email using Vercel's integration with Email Service Providers
    // You'll need to configure this in your Vercel dashboard
    const response = await fetch('https://api.vercel.com/v6/sendgrid/mail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The Vercel CLI automatically injects these environment variables during deployment
        'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'directorytraffic@gmail.com' }],
            subject: `Contact Form: ${subject || 'New message from your website'}`
          }
        ],
        from: { email: 'noreply@yourdomain.com', name: 'Contact Form' },
        reply_to: { email, name },
        content: [
          {
            type: 'text/plain',
            value: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
          },
          {
            type: 'text/html',
            value: `<p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>`
          }
        ]
      })
    });
    
    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errorData = await response.json();
      console.error('Error sending email:', errorData);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error in send-email API:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 