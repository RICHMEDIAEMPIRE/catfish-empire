/*
 * Script to set all inventory quantities to 7 in Supabase.
 *
 * Usage:
 *   1. Install the @supabase/supabase-js package if not already present:
 *      npm install @supabase/supabase-js
 *   2. Ensure the SUPABASE_URL and SUPABASE_KEY environment variables are set
 *      or replace them directly in the code below.
 *   3. Run this script with node:
 *      node set_inventory_to_seven.js
 */

const { createClient } = require('@supabase/supabase-js');

// Read credentials from environment or replace with your own values
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setAllQuantities() {
  const colors = ['Blue', 'Green', 'Red', 'Silver', 'Black', 'Brown'];
  for (const color of colors) {
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: 7 })
      .eq('color', color);
    if (error) {
      console.error(`Failed to set quantity for ${color}:`, error);
    } else {
      console.log(`Quantity for ${color} set to 7`);
    }
  }
  console.log('✅ All quantities updated to 7.');
  process.exit(0);
}

setAllQuantities().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});