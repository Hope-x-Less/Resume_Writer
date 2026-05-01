async function run() {
  const payload = {
    name: "Alice Example",
    education: "B.Sc. Computer Science",
    experience: "3 years as software engineer",
    skills: "JavaScript, Node.js, React",
    jobTitle: "Frontend Engineer",
    additionalNotes: "Enthusiastic about web performance"
  };

  try {
    const res = await fetch('http://localhost:3000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('HTTP', res.status);
    console.log('BODY:', text);
  } catch (err) {
    console.error('Request failed:', err);
  }
}

run();
