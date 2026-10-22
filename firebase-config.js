// ตั้งค่า Firebase ของหน่วย
// - ปล่อยเป็น null = "โหมดทดลอง" ข้อมูลเก็บในเครื่องนี้เท่านั้น ใช้ลองระบบ/ฝึกครู
// - ใส่ค่าจาก Firebase Console > Project settings > Your apps > Web app (SDK setup and configuration)
//   ค่าเหล่านี้ไม่ใช่ความลับ ความปลอดภัยของข้อมูลมาจาก Authentication + database.rules.json
//
// ตัวอย่าง:
// window.FIREBASE_CONFIG = {
//   apiKey: "AIza....",
//   authDomain: "cho1pan52.firebaseapp.com",
//   databaseURL: "https://cho1pan52-default-rtdb.firebaseio.com",
//   projectId: "cho1pan52",
//   appId: "1:....:web:...."
// };
window.FIREBASE_CONFIG = null;
