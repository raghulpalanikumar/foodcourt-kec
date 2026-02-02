const axios = require('axios');

async function testTotalSpent() {
  try {
    console.log('Testing total spent calculation...\n');
    
    // Get user orders
    const ordersResponse = await axios.get('http://localhost:5000/api/orders', {
      headers: {
        'Authorization': 'Bearer your-test-token-here' // You'll need a valid token
      }
    });
    
    console.log('Raw response:', JSON.stringify(ordersResponse.data, null, 2));
    
    const orders = ordersResponse.data.data?.orders || ordersResponse.data.orders || [];
    console.log(`\nFound ${orders.length} orders`);
    
    // Calculate total spent
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    console.log(`\nTotal spent calculation:`);
    console.log(`Sum of all order.totalAmount: ${totalSpent}`);
    
    // Show individual orders
    console.log('\nIndividual orders:');
    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order._id}`);
      console.log(`   Token: ${order.tokenNumber}`);
      console.log(`   Total Amount: ${order.totalAmount}`);
      console.log(`   Status: ${order.orderStatus}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testTotalSpent();