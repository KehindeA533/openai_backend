// Import test function from index.js
import { testCalendarEndpoints } from './index.js';

// Run the test
console.log('Starting Calendar API tests...');
testCalendarEndpoints()
  .then(() => {
    console.log('Tests completed');
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });