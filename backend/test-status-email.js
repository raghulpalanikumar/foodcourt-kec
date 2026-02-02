const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { sendOrderStatusUpdateEmail } = require('./utils/emailService');

const testStatusEmail = async () => {
  console.log('--- Starting Status Update Email Test ---');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '********' : 'NOT FOUND');
  console.log('MAIL_FROM:', process.env.MAIL_FROM);

  const testOrderDetails = {
    orderId: 'TEST5678',
    tokenNumber: 'KEC-1234',
    total: 1500,
    items: [
      { foodName: 'Test Burger', quantity: 1, price: 800 },
      { foodName: 'Test Fries', quantity: 2, price: 350 }
    ]
  };

  const testStatuses = ['Preparing', 'Ready', 'OutForDelivery', 'Delivered', 'Cancelled'];

  for (const status of testStatuses) {
    try {
      console.log(`\n--- Testing status: ${status} ---`);
      console.log('Attempting to send status update email to:', process.env.SMTP_USER);
      
      await sendOrderStatusUpdateEmail(
        process.env.SMTP_USER, // Send to self for testing
        'Test User',
        testOrderDetails,
        status
      );
      
      console.log(`✅ Status update email for "${status}" sent successfully!`);
      
      // Wait 2 seconds between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Status update email for "${status}" FAILED:`);
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }
  
  console.log('\n--- All tests completed ---');
};

testStatusEmail();