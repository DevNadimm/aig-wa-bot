
async function run() {
  const res = await fetch('https://simple-backend-znk7.onrender.com/api/doctors/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ department: 'cardiology' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
run();

