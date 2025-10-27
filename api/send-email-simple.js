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
    
    // Use formsubmit.co service - a free email forwarding service
    const response = await fetch('https://formsubmit.co/ajax/directorytraffic@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        subject: subject || 'New Contact Form Submission',
        message
      })
    });
    
    const result = await response.json();
    
    if (result.success === 'true' || result.success === true) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Error from formsubmit.co:', result);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error in send-email-simple API:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
} 