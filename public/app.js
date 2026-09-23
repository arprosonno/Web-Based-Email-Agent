document.getElementById('agentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusDiv = document.getElementById('status');
  const submitBtn = document.getElementById('submitBtn');

  const text = document.getElementById('circularText').value;
  const imageFile = document.getElementById('circularImage').files[0];

  if (!text && !imageFile) {
    alert("Please provide either text or an image of the circular.");
    return;
  }

  statusDiv.classList.remove('hidden');
  statusDiv.textContent = "Processing circular with Gemini and preparing email...";
  submitBtn.disabled = true;

  try {
    let base64Image = null;
    let mimeType = null;

    if (imageFile) {
      base64Image = await convertBase64(imageFile);
      mimeType = imageFile.type;
    }

    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        imageBase64: base64Image ? base64Image.split(',')[1] : null,
        mimeType: mimeType
      })
    });

    const result = await response.json();
    if (response.ok) {
      statusDiv.textContent = `✅ Success: ${result.message}\n\nRecipient: ${result.recipient}\nSubject: ${result.subject}`;
    } else {
      statusDiv.textContent = `❌ Error: ${result.error}`;
    }
  } catch (err) {
    statusDiv.textContent = `❌ Network Error: ${err.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});

function convertBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}