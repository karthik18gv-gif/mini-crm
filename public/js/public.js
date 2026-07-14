document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('leadForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    source: document.getElementById('source').value,
    message: document.getElementById('message').value.trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    statusEl.textContent = 'Please fill in all required fields.';
    statusEl.style.color = 'var(--red)';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Submission failed.');

    statusEl.textContent = "Thanks! We've received your inquiry and will be in touch shortly.";
    statusEl.style.color = 'var(--teal)';
    form.reset();
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.style.color = 'var(--red)';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Inquiry';
  }
});
