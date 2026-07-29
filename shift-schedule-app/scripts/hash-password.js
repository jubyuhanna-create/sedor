// استخدام: node scripts/hash-password.js "كلمة_المرور"
const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.log('استخدام: node scripts/hash-password.js "كلمة_المرور"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nانسخ هذا الـ hash واستخدمه في SQL Editor داخل Supabase:\n");
console.log(hash);
console.log("");
