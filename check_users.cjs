const { dbGet, dbAll } = require('./server/database');

async function checkUsers() {
  try {
    console.log('Checking users in database...');

    // Get all users
    const users = await dbAll('SELECT id, name, email, role, school_id FROM users');
    console.log('All users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Get teachers specifically
    const teachers = await dbAll('SELECT id, name, email, role FROM users WHERE role = ?', ['teacher']);
    console.log('\nTeachers:');
    teachers.forEach(teacher => {
      console.log(`- ${teacher.name} (${teacher.email})`);
    });

    // Get super admin
    const superAdmin = await dbAll('SELECT id, name, email, role FROM users WHERE role = ?', ['super_admin']);
    console.log('\nSuper Admin:');
    superAdmin.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();