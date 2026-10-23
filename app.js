// app.js - Data persistence and sample data management
const DOCTORS_LIST = [
  { id: "D-101", name: "Dr. K. Rahman", specialty: "General Medicine", fee: 800 },
  { id: "D-102", name: "Dr. Nusrat Jahan", specialty: "Cardiology", fee: 1200 },
  { id: "D-103", name: "Dr. Farhana Ahmed", specialty: "Gynecology & Obs", fee: 1000 },
  { id: "D-104", name: "Dr. Tariqul Islam", specialty: "Orthopedics", fee: 1000 },
  { id: "D-105", name: "Dr. Mahmudul Hasan", specialty: "Pediatrics", fee: 900 }
];

const LAB_TEST_CATALOG = [
  { code: "CBC", name: "Complete Blood Count", price: 500 },
  { code: "LFT", name: "Liver Function Test", price: 1200 },
  { code: "RBS", name: "Random Blood Sugar", price: 200 },
  { code: "LIPID", name: "Lipid Profile", price: 1400 },
  { code: "URINE", name: "Urine Routine Examination", price: 350 },
  { code: "XRAY", name: "Chest X-Ray P/A", price: 800 },
  { code: "ECG", name: "12-Lead Electrocardiogram", price: 600 },
  { code: "USG", name: "Ultrasonography Whole Abdomen", price: 1800 }
];

// Your requested roster — guaranteed to appear in the sample dataset
const NAMED_PATIENTS = [
  "Fahim Ahmed",
  "Saiful Bhuiyan",
  "Humaira Shahzad",
  "Mahfuj Ruzel",
  "Maria Rehman",
  "Muntasir Mamun",
  "Rahmatul Islam",
  "Sanjidul Islam Sanju",
  "Sufia Sraboni",
  "Sumaiya Salekin",
  "Tayaba Kabir Richee",
  "Zayan"
];

// Initialize Storage Keys if not present
function initStorage() {
  if (!localStorage.getItem('hp_patients')) localStorage.setItem('hp_patients', JSON.stringify([]));
  if (!localStorage.getItem('hp_visits')) localStorage.setItem('hp_visits', JSON.stringify([]));
  if (!localStorage.getItem('hp_tests')) localStorage.setItem('hp_tests', JSON.stringify([]));
  if (!localStorage.getItem('hp_payments')) localStorage.setItem('hp_payments', JSON.stringify([]));
  if (!localStorage.getItem('hp_doctors')) localStorage.setItem('hp_doctors', JSON.stringify(DOCTORS_LIST));
}

initStorage();

function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Format numbers as currency
function formatTk(num) {
  return "Tk " + Number(num || 0).toLocaleString('en-US');
}

// Today's date string YYYY-MM-DD
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Generate ~50 patients (12 named + rest random) and 1 month of transactions
function loadSampleData() {
  const firstNames = ["Mohammad", "Fatima", "Abdul", "Ayesha", "Rashid", "Tasnim", "Kamal", "Shirin", "Habib", "Nusrat", "Imran", "Farzana", "Zahid", "Ruma", "Sabbir", "Meher", "Anis", "Tania", "Arif", "Nasrin"];
  const lastNames = ["Hossain", "Chowdhury", "Akter", "Kazi", "Begum", "Mia", "Sultana", "Hasan", "Islam", "Khan", "Ahmed", "Uddin", "Rahman", "Mollah"];
  const districts = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Sylhet", "Barisal", "Comilla", "Gazipur", "Narayanganj"];
  const genders = ["Male", "Female"];
  const paymentMethods = ["bKash", "Cash", "Card"];

  const patients = [];
  const visits = [];
  const tests = [];
  const payments = [];

  const now = new Date();
  let patientCounter = 1;

  // Helper to build one patient record
  function buildPatient(name) {
    const pId = `P-${String(patientCounter).padStart(4, '0')}`;
    patientCounter++;
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const age = Math.floor(Math.random() * 55) + 15;
    const phone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;
    const address = `${Math.floor(Math.random() * 150) + 1}, Road ${Math.floor(Math.random() * 20) + 1}, ${districts[Math.floor(Math.random() * districts.length)]}`;
    const daysAgo = Math.floor(Math.random() * 30);
    const regDate = new Date(now);
    regDate.setDate(now.getDate() - daysAgo);
    const regDateStr = regDate.toISOString().split('T')[0];

    return {
      id: pId,
      name: name,
      age: age,
      gender: gender,
      phone: phone,
      address: address,
      registeredAt: regDateStr
    };
  }

  // 1. Add your 12 named people first (guaranteed in the dataset)
  NAMED_PATIENTS.forEach(name => {
    patients.push(buildPatient(name));
  });

  // 2. Fill the rest randomly up to 50 total
  const targetTotal = 50;
  while (patients.length < targetTotal) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    patients.push(buildPatient(`${fn} ${ln}`));
  }

  // Create ~75 Doctor Visits
  const symptoms = ["Fever and body ache", "Severe chest pain", "Persistent cough", "Joint pain and stiffness", "High blood pressure checkup", "Digestive distress", "Migraine headaches"];
  const meds = ["Paracetamol 500mg, Omeprazole 20mg", "Amlodipine 5mg, Aspirin 75mg", "Azithromycin 500mg, Montelukast 10mg", "Naproxen 500mg, Calcium-D"];

  for (let v = 1; v <= 75; v++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const doctor = DOCTORS_LIST[Math.floor(Math.random() * DOCTORS_LIST.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const visitDate = new Date(now);
    visitDate.setDate(now.getDate() - daysAgo);
    const visitDateStr = visitDate.toISOString().split('T')[0];

    const visitId = `V-${String(v).padStart(4, '0')}`;
    visits.push({
      id: visitId,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      fee: doctor.fee,
      problem: symptoms[Math.floor(Math.random() * symptoms.length)],
      prescription: meds[Math.floor(Math.random() * meds.length)],
      date: visitDateStr
    });

    // Pay for visit (85% paid, 15% due)
    if (Math.random() > 0.15) {
      payments.push({
        id: `PAY-${payments.length + 1001}`,
        patientId: patient.id,
        patientName: patient.name,
        type: "Doctor Visit",
        refId: visitId,
        amount: doctor.fee,
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        date: visitDateStr
      });
    }
  }

  // Create ~60 Lab Orders
  for (let t = 1; t <= 60; t++) {
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const testItem = LAB_TEST_CATALOG[Math.floor(Math.random() * LAB_TEST_CATALOG.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const testDate = new Date(now);
    testDate.setDate(now.getDate() - daysAgo);
    const testDateStr = testDate.toISOString().split('T')[0];

    const isDone = Math.random() > 0.3; // 70% done, 30% pending
    const testId = `T-${String(t).padStart(4, '0')}`;

    tests.push({
      id: testId,
      patientId: patient.id,
      patientName: patient.name,
      testCode: testItem.code,
      testName: testItem.name,
      price: testItem.price,
      status: isDone ? "Done" : "Pending",
      result: isDone ? "Normal parameters observed." : "",
      date: testDateStr
    });

    // Pay for lab test
    if (Math.random() > 0.2) {
      payments.push({
        id: `PAY-${payments.length + 1001}`,
        patientId: patient.id,
        patientName: patient.name,
        type: "Lab Test",
        refId: testId,
        amount: testItem.price,
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        date: testDateStr
      });
    }
  }

  setStore('hp_patients', patients);
  setStore('hp_visits', visits);
  setStore('hp_tests', tests);
  setStore('hp_payments', payments);
  setStore('hp_doctors', DOCTORS_LIST);

  alert(`Sample data generated successfully!\n- ${patients.length} Patients (incl. your 12 named entries)\n- 5 Doctors\n- 75 Visits\n- 60 Lab Orders\n- ${payments.length} Payments`);
  window.location.reload();
}