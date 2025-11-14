const { Client } = require('pg');

// Your Render PostgreSQL URL
const connectionString = 'postgresql://eduke_user:2gIiuQhffmbPEHnl6aEHM9JsGHxEHDu1@dpg-d4b2seadbo4c73e8qfl0-a.oregon-postgres.render.com/eduke';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    // This is required for Render connections
    rejectUnauthorized: false
  }
});

async function checkConnection() {
  try {
    console.log('Attempting to connect to the database...');
    await client.connect();
    console.log('✅ Connection Successful!');
    
    // Run a simple test query to confirm
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Current database time:', res.rows[0].now);

  } catch (err) {
    console.error('🔥 Connection Error:');
    console.error(err.message);
  } finally {
    // Always close the connection
    await client.end();
    console.log('Connection closed.');
  }
}

checkConnection();