const Database = require('better-sqlite3');
const path = require('path');

const db = Database(path.join(__dirname, 'server', 'eduke.db'));

console.log('Users with parent role:');
const parents = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE role = ?').all('parent');
console.log(parents);

console.log('\nParent-student relations:');
const relations = db.prepare('SELECT * FROM parent_student_relations').all();
console.log(relations);

console.log('\nAll students:');
const students = db.prepare('SELECT id, first_name, last_name, grade FROM students LIMIT 5').all();
console.log(students);

db.close();